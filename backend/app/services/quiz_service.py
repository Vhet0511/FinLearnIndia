
import json
import requests

from app.config import OLLAMA_URL, OLLAMA_MODEL
from app.services.rag_service import retrieve_lesson_chunks


QUIZ_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "options": {
                        "type": "array",
                        "minItems": 4,
                        "maxItems": 4,
                        "items": {"type": "string"}
                    },
                    "correct_answer": {"type": "string"},
                    "explanation": {"type": "string"}
                },
                "required": [
                    "question",
                    "options",
                    "correct_answer",
                    "explanation"
                ]
            }
        }
    },
    "required": ["questions"]
}


def generate_quiz(lesson_id: str) -> dict:
    """Generate a five-question quiz grounded in a published lesson."""

    # Retrieve lesson context through RAG.
    chunks = retrieve_lesson_chunks(
        lesson_id=lesson_id,
        question=(
            "Important concepts, definitions, key facts, "
            "benefits, processes, and differences explained in this lesson"
        ),
        limit=5
    )

    if not chunks:
        raise ValueError("No relevant lesson content found.")

    context = "\n\n".join(
        chunk["text"] for chunk in chunks
    )

    prompt = f"""
You are a quiz generator for the FinLearn educational platform.

Create exactly 5 multiple-choice questions based ONLY on the
lesson context provided below.

Rules:
1. Every question must have exactly 4 options.
2. There must be exactly one correct option per question.
3. The correct_answer must exactly match one of the four options.
4. Include a clear explanation for each correct answer.
5. Cover different concepts from the provided context.
6. Do not invent facts that are absent from the context.
7. Return only data matching the requested JSON schema.

LESSON CONTEXT:
{context}
"""

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": QUIZ_SCHEMA
        },
        timeout=300
    )

    response.raise_for_status()

    result = response.json()
    raw_output = result.get("response", "")

    try:
        quiz = json.loads(raw_output)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "Ollama returned invalid quiz JSON."
        ) from exc

    # Validate the generated quiz before returning it.
    questions = quiz.get("questions")

    if not isinstance(questions, list) or len(questions) != 5:
        raise ValueError("The generated quiz must contain exactly 5 questions.")

    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            raise ValueError(f"Question {index} has an invalid format.")

        options = question.get("options")
        answer = question.get("correct_answer")

        if not isinstance(options, list) or len(options) != 4:
            raise ValueError(
                f"Question {index} must have exactly 4 options."
            )

        if not all(isinstance(option, str) and option.strip() for option in options):
            raise ValueError(
                f"Question {index} contains an empty or invalid option."
            )

        if len(set(options)) != 4:
            raise ValueError(
                f"Question {index} must have four distinct options."
            )

        if answer not in options:
            raise ValueError(
                f"Question {index} has a correct answer that is not one of its options."
            )

        for field in ("question", "explanation"):
            if not isinstance(question.get(field), str) or not question[field].strip():
                raise ValueError(
                    f"Question {index} has a missing or invalid {field}."
                )

    return quiz
