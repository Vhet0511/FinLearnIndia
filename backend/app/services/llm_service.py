
import json
import requests

from app.config import OLLAMA_URL, OLLAMA_MODEL


LESSON_SCHEMA = {
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
    "required": ["content", "bullet_points", "notes"]
}


def generate_lesson(title: str, summary: str) -> dict:
    prompt = f"""
You are an expert educational content writer.

Lesson title: {title}
Lesson summary: {summary}

Generate:
1. content: exactly 2500+ words of detailed lesson content. It should consist of 5 to 6 small paragraphs. break line after each paragraph. Each paragraph should be 400-500 words long. The content should be informative, engaging, and easy to understand. Use clear examples and explanations to illustrate key concepts. Avoid using overly technical language or jargon. Ensure that the content is well-structured and flows logically from one paragraph to the next.
2. bullet_points: an array of strings, approximately 500 words total.
3. notes: exactly 5 sentences containing important learnings.

Formatting requirements:
- Write all text in plain text, not Markdown.
- Do not use Markdown headings such as #, ##, or ###.
- Do not use Markdown bold, italic, code fences, or tables.
- Use ordinary headings without Markdown symbols.
- Separate paragraphs with blank lines.
- Keep bullet_points and notes as arrays of strings.
- Do not add extra fields or omit required fields.

Stay focused on the title and summary.
Return only the JSON object matching the required schema.
"""

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "format": LESSON_SCHEMA,
            "stream": False,
            "options": {"num_predict": 8000}
        },
        timeout=900
    )

    response.raise_for_status()
    lesson = json.loads(response.json()["response"])

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
        raise ValueError("Ollama returned an invalid lesson structure.")

    return lesson
