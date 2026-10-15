
import uuid
import requests

from pathlib import Path

from bson import ObjectId
from qdrant_client import QdrantClient, models

from app.config import OLLAMA_URL
from app.database import uploaded_lessons


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

EMBEDDING_MODEL = "nomic-embed-text"
COLLECTION_NAME = "lesson_chunks"

# Persistent local storage inside the backend directory.
QDRANT_PATH = Path(__file__).resolve().parents[2] / "qdrant_storage"

qdrant = QdrantClient(path=str(QDRANT_PATH))


# --------------------------------------------------
# 1. GENERATE EMBEDDINGS USING OLLAMA
# --------------------------------------------------

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Convert a list of text passages into embeddings."""

    if not texts:
        return []

    response = requests.post(
        f"{OLLAMA_URL}/api/embed",
        json={
            "model": EMBEDDING_MODEL,
            "input": texts
        },
        timeout=300
    )

    response.raise_for_status()

    embeddings = response.json().get("embeddings")

    if (
        not isinstance(embeddings, list)
        or len(embeddings) != len(texts)
        or not all(
            isinstance(vector, list) and vector
            for vector in embeddings
        )
    ):
        raise ValueError("Ollama returned invalid embeddings.")

    return embeddings


# --------------------------------------------------
# 2. SPLIT LESSON INTO CHUNKS
# --------------------------------------------------

def split_into_chunks(
    text: str,
    chunk_size: int = 180,
    overlap: int = 30
) -> list[str]:
    """Split text into overlapping chunks of words."""

    words = text.split()

    if not words:
        return []

    if overlap >= chunk_size:
        raise ValueError("Overlap must be smaller than chunk size.")

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])

        if chunk.strip():
            chunks.append(chunk)

        if end == len(words):
            break

        start = end - overlap

    return chunks


# --------------------------------------------------
# 3. CREATE OR VALIDATE QDRANT COLLECTION
# --------------------------------------------------

def ensure_collection(vector_size: int) -> None:
    """Create the collection if it does not exist."""

    if not qdrant.collection_exists(COLLECTION_NAME):
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE
            )
        )
        return

    collection = qdrant.get_collection(COLLECTION_NAME)

    existing_size = collection.config.params.vectors.size

    if existing_size != vector_size:
        raise ValueError(
            f"Embedding dimension mismatch: "
            f"collection has {existing_size}, "
            f"model returned {vector_size}. "
            "Use a separate collection for the new embedding model."
        )


# --------------------------------------------------
# 4. INDEX A PUBLISHED LESSON
# --------------------------------------------------

def index_lesson(lesson_id: str) -> dict:
    """Read a published lesson and store its chunks in Qdrant."""

    if not ObjectId.is_valid(lesson_id):
        raise ValueError("Invalid MongoDB lesson ID.")

    lesson = uploaded_lessons.find_one({
        "_id": ObjectId(lesson_id)
    })

    if not lesson:
        raise ValueError("Published lesson not found.")

    title = lesson.get("title", "")
    summary = lesson.get("summary", "")
    content = lesson.get("content", "")

    if not isinstance(content, str) or not content.strip():
        raise ValueError("Lesson content is empty.")

    bullet_points = lesson.get("bullet_points", [])
    notes = lesson.get("notes", [])

    if not isinstance(bullet_points, list):
        bullet_points = []

    if not isinstance(notes, list):
        notes = []

    # Include all lesson material in the searchable text.
    lesson_text = f"""
Lesson title:
{title}

Lesson summary:
{summary}

Lesson content:
{content}

Important points:
{" ".join(str(point) for point in bullet_points)}

Study notes:
{" ".join(str(note) for note in notes)}
"""

    chunks = split_into_chunks(lesson_text)

    if not chunks:
        raise ValueError("Could not create lesson chunks.")

    # Embed all chunks in one Ollama request.
    embeddings = generate_embeddings(chunks)

    ensure_collection(len(embeddings[0]))

    lesson_id_str = str(lesson["_id"])

    # Remove older indexed versions of this lesson.
    # This keeps re-indexing from creating duplicate chunks.
    qdrant.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="lesson_id",
                        match=models.MatchValue(
                            value=lesson_id_str
                        )
                    )
                ]
            )
        ),
        wait=True
    )

    points = []

    for index, (chunk, embedding) in enumerate(
        zip(chunks, embeddings)
    ):
        point_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"finlearn:{lesson_id_str}:{index}"
            )
        )

        points.append(
            models.PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "lesson_id": lesson_id_str,
                    "title": title,
                    "chunk_index": index,
                    "text": chunk
                }
            )
        )

    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
        wait=True
    )

    return {
        "lesson_id": lesson_id_str,
        "title": title,
        "chunks_created": len(chunks),
        "message": "Lesson indexed successfully."
    }


def close_qdrant():
    """Close the local Qdrant client cleanly."""
    qdrant.close()


# --------------------------------------------------
# 5. RETRIEVE RELEVANT LESSON CHUNKS
# --------------------------------------------------

def retrieve_lesson_chunks(
    lesson_id: str,
    question: str,
    limit: int = 5
) -> list[dict]:
    """Retrieve relevant chunks from a specific lesson using semantic search."""

    if not ObjectId.is_valid(lesson_id):
        raise ValueError("Invalid MongoDB lesson ID.")

    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    if limit < 1:
        raise ValueError("Limit must be at least 1.")

    if not qdrant.collection_exists(COLLECTION_NAME):
        raise ValueError("Qdrant collection has not been created. Index a lesson first.")

    # Convert the user's question into an embedding.
    query_embedding = generate_embeddings([question])[0]

    # Search only chunks belonging to the requested lesson.
    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="lesson_id",
                    match=models.MatchValue(value=lesson_id)
                )
            ]
        ),
        limit=limit,
        with_payload=True
    ).points

    return [
        {
            "text": point.payload["text"],
            "score": point.score,
            "chunk_index": point.payload["chunk_index"]
        }
        for point in results
        if point.payload and point.payload.get("text")
    ]
