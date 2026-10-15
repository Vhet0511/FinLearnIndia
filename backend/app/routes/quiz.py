
from fastapi import APIRouter, HTTPException
from requests import RequestException

from app.services.quiz_service import generate_quiz


router = APIRouter(
    prefix="/api/lessons",
    tags=["Quiz"]
)


@router.post("/{lesson_id}/quiz")
def generate_lesson_quiz(lesson_id: str):
    """Generate a five-question quiz for a published lesson."""

    try:
        quiz = generate_quiz(lesson_id)
        return quiz

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to communicate with the Ollama service."
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Quiz generation failed."
        ) from exc
