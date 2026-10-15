
from app.services.rag_service import (
    retrieve_lesson_chunks,
    close_qdrant
)

LESSON_ID = "6ad0aa0123ead9bd194591b6"


def main():
    question = input("Enter a question about the lesson: ").strip()

    try:
        chunks = retrieve_lesson_chunks(LESSON_ID, question)

        if not chunks:
            print("No relevant passages found.")
            return

        for i, chunk in enumerate(chunks, start=1):
            print(f"\n--- Passage {i} ---")
            print(f"Similarity: {chunk['score']:.4f}")
            print(chunk["text"])

    except Exception as exc:
        print(f"Retrieval failed: {exc}")

    finally:
        close_qdrant()


if __name__ == "__main__":
    main()
