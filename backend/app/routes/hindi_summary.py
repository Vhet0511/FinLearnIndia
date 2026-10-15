
from fastapi import APIRouter, HTTPException

from app.services.hindi_summary_service import (
    summarize_lesson_in_hindi
)

router = APIRouter(prefix="/api/lessons", tags=["Hindi Summary"])


@router.post("/{lesson_id}/summary-hi")
def create_hindi_summary(lesson_id: str):
    try:
        return summarize_lesson_in_hindi(lesson_id)

    except ValueError as exc:
        message = str(exc)

        if message == "Published lesson not found.":
            raise HTTPException(status_code=404, detail=message)

        raise HTTPException(status_code=400, detail=message)

    except Exception as exc:
        print(f"Hindi summary generation failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate the Hindi summary."
        )
