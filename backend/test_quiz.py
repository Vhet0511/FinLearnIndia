
import json

from app.services.quiz_service import generate_quiz
from app.services.rag_service import close_qdrant


LESSON_ID = "6ad0aa0123ead9bd194591b6"


def main():
    try:
        print("\nGenerating quiz using RAG and Ollama...\n")

        quiz = generate_quiz(LESSON_ID)

        print(json.dumps(quiz, indent=4, ensure_ascii=False))

        print("\nQuiz generated successfully!")
        print(f"Total questions: {len(quiz['questions'])}")

        for i, question in enumerate(quiz["questions"], start=1):
            print(f"\nQuestion {i}: {question['question']}")
            for j, option in enumerate(question["options"], start=1):
                print(f"  {j}. {option}")
            print(f"Correct answer: {question['correct_answer']}")
            print(f"Explanation: {question['explanation']}")

    except Exception as exc:
        print(f"\nQuiz generation failed: {exc}")

    finally:
        close_qdrant()


if __name__ == "__main__":
    main()
