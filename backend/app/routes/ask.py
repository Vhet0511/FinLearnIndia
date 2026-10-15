
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from requests import RequestException

from app.services.ask_service import ask_lesson_question


router = APIRouter(
    prefix="/api/lessons",
    tags=["Ask AI"]
)


class AskQuestionRequest(BaseModel):
    question: str


@router.post("/{lesson_id}/ask")
def ask_question(lesson_id: str, request: AskQuestionRequest):
    """Answer a question about a specific lesson."""

    try:
        return ask_lesson_question(
            lesson_id=lesson_id,
            question=request.question
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except RequestException as exc:
        print("Ollama request failed:", str(exc))
        raise HTTPException(
            status_code=502,
            detail="Failed to communicate with the Ollama service."
        ) from exc

    except Exception as exc:
        print("Ask AI error:", str(exc))
        raise HTTPException(
            status_code=500,
            detail="Failed to answer the question."
        ) from exc
