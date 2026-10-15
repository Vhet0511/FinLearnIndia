
import requests
from bson import ObjectId

from app.config import OLLAMA_URL, OLLAMA_MODEL
from app.database import uploaded_lessons


def summarize_lesson_in_hindi(lesson_id: str) -> dict:
    """Generate a Hindi summary of a published lesson using Ollama."""

    if not ObjectId.is_valid(lesson_id):
        raise ValueError("Invalid lesson ID.")

    lesson = uploaded_lessons.find_one({
        "_id": ObjectId(lesson_id)
    })

    if not lesson:
        raise ValueError("Published lesson not found.")

    title = lesson.get("title", "")
    content = lesson.get("content", "")
    bullet_points = lesson.get("bullet_points", [])
    notes = lesson.get("notes", [])

    if not isinstance(content, str) or not content.strip():
        raise ValueError("Lesson content is empty.")

    if not isinstance(bullet_points, list):
        bullet_points = []

    if not isinstance(notes, list):
        notes = []

    lesson_text = f"""
Title:
{title}

Content:
{content}

Important points:
{" ".join(str(point) for point in bullet_points)}

Notes:
{" ".join(str(note) for note in notes)}
"""

    prompt = f"""
You are a Hindi financial education teacher for FinLearn India.

Create a clear, accurate summary of the following lesson in
simple, natural Hindi using Devanagari script.

Instructions:
- Preserve the lesson's important concepts and facts.
- Explain financial terms in simple Hindi.
- Use short paragraphs and bullet points where helpful.
- Keep important English financial terms in parentheses when useful.
- Do not invent facts that are absent from the lesson.
- Return only the Hindi summary, without introductory commentary.

LESSON:
{lesson_text}

HINDI SUMMARY:
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

    summary = response.json().get("response", "").strip()

    if not summary:
        raise ValueError("Ollama returned an empty Hindi summary.")

    return {
        "lesson_id": str(lesson["_id"]),
        "language": "hi",
        "summary": summary
    }
