from datetime import datetime, timezone

from app.database import draft_lessons
from app.services.llm_service import generate_lesson


def create_draft(title: str, summary: str) -> dict:
    # Generate lesson content
    lesson = generate_lesson(title, summary)

    # Prepare the MongoDB document
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

    # Store the draft
    result = draft_lessons.insert_one(document)

    # Return a JSON-serializable response
    document["_id"] = str(result.inserted_id)
    document["created_at"] = now.isoformat()
    document["updated_at"] = now.isoformat()

    return document