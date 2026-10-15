
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient
from datetime import datetime, timezone
import requests
import json

# 1. Create the FastAPI application
app = FastAPI(title="FinLearnIndia - Draft Lessons")

# 2. Connect to local MongoDB
client = MongoClient(
    "mongodb://127.0.0.1:27017/",
    serverSelectionTimeoutMS=5000
)

db = client["finlearnindia"]
draft_lessons = db["draft_lessons"]


# 3. Define the HTTP request fields
class LessonRequest(BaseModel):
    title: str
    summary: str


# 4. Create the lesson generation endpoint
@app.post("/lessons/generate")
def create_draft(request: LessonRequest):

    title = request.title.strip()
    summary = request.summary.strip()

    if not title or not summary:
        raise HTTPException(
            status_code=400,
            detail="Title and summary cannot be empty."
        )

    # 5. Prepare the prompt for Ollama
    prompt = f"""
    You are an expert educational content writer.

    Lesson title: {title}
    Lesson summary: {summary}

    Generate a lesson with exactly these fields:

    - content: approximately 2000 words of detailed lesson content.
    - bullet_points: an array of strings, approximately 500 words total.
    - notes: exactly 5 sentences containing important learnings.

    Return valid JSON only. Do not use Markdown code fences.
    """

    # 6. Ask Ollama to generate the lesson
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5:7b",
                "prompt": prompt,
                "format": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string"},
                        "bullet_points": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "notes": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": [
                        "content",
                        "bullet_points",
                        "notes"
                    ]
                },
                "stream": False,
                "options": {
                    "num_predict": 8000
                }
            },
            timeout=900
        )

        response.raise_for_status()
        lesson = json.loads(response.json()["response"])

    except (requests.RequestException, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Lesson generation failed: {error}"
        )

    # 7. Validate the generated lesson
    if (
        not isinstance(lesson, dict)
        or not isinstance(lesson.get("content"), str)
        or not lesson["content"].strip()
        or not isinstance(lesson.get("bullet_points"), list)
        or not all(
            isinstance(point, str) and point.strip()
            for point in lesson["bullet_points"]
        )
        or not isinstance(lesson.get("notes"), list)
        or len(lesson["notes"]) != 5
        or not all(
            isinstance(note, str) and note.strip()
            for note in lesson["notes"]
        )
    ):
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an invalid lesson structure."
        )

    # 8. Prepare the MongoDB document
    now = datetime.now(timezone.utc)

    document = {
        "title": title,
        "summary": summary,
        "content": lesson["content"],
        "bullet_points": lesson["bullet_points"],
        "notes": lesson["notes"],
        "status": "draft",
        "created_at": now,
        "updated_at": now,
        "published_at": None
    }

    # 9. Save the lesson as a draft
    try:
        result = draft_lessons.insert_one(document)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save lesson to MongoDB: {error}"
        )

    # 10. Return the saved lesson as JSON
    document["_id"] = str(result.inserted_id)
    document["created_at"] = now.isoformat()
    document["updated_at"] = now.isoformat()

    return {
        "message": "Lesson generated and saved as draft.",
        "lesson": document
    }


# 11. Simple health-check endpoint
@app.get("/")
def home():
    return {
        "message": "FinLearnIndia draft API is running."
    }
