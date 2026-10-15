
import requests

from app.config import OLLAMA_URL, OLLAMA_MODEL
from app.services.rag_service import retrieve_lesson_chunks


def ask_lesson_question(lesson_id: str, question: str) -> dict:
    """Answer a user's question using relevant lesson content."""

    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    # Retrieve relevant passages from the selected lesson.
    chunks = retrieve_lesson_chunks(
        lesson_id=lesson_id,
        question=question.strip(),
        limit=5
    )

    if not chunks:
        raise ValueError("No relevant lesson content found.")

    context = "\n\n".join(
        chunk["text"] for chunk in chunks
    )

    prompt = f"""
You are FinLearn's financial education assistant.

Answer the user's question using the lesson context below.

Rules:
1. Explain the concept in simple, clear language.
2. Base the answer on the provided lesson context.
3. If the context does not contain enough information, say so.
4. Do not invent lesson facts.
5. Keep the answer focused on the user's question.

LESSON CONTEXT:
{context}

USER QUESTION:
{question.strip()}

ANSWER:
"""

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        },
        timeout=300
    )

    response.raise_for_status()

    answer = response.json().get("response", "").strip()

    if not answer:
        raise ValueError("The AI returned an empty answer.")

    return {
        "lesson_id": lesson_id,
        "question": question.strip(),
        "answer": answer
    }
