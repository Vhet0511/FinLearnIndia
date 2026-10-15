
from app.services.rag_service import index_lesson, close_qdrant


def main():
    print("=== FinLearn India: RAG Indexing Test ===")

    lesson_id = input(
        "Enter the MongoDB ID of a published lesson: "
    ).strip()

    if not lesson_id:
        print("Error: Lesson ID cannot be empty.")
        return

    try:
        result = index_lesson(lesson_id)

        print("\nLesson indexed successfully!")
        print(f"Title: {result['title']}")
        print(f"Lesson ID: {result['lesson_id']}")
        print(f"Chunks created: {result['chunks_created']}")
        print(result["message"])

    except Exception as exc:
        print(f"\nRAG indexing failed: {exc}")

    finally:
        close_qdrant()


if __name__ == "__main__":
    main()
