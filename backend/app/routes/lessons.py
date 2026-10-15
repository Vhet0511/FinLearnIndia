
import requests

from datetime import datetime, timezone
from json import JSONDecodeError

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from pymongo.errors import PyMongoError

from app.schemas.lesson import LessonRequest, LessonUpdate
from app.services.lesson_service import create_draft
from app.database import draft_lessons, uploaded_lessons


router = APIRouter(
    prefix="/api/lessons",
    tags=["Lessons"]
)


# Helper: validate MongoDB lesson ID
def get_lesson_id(lesson_id: str) -> ObjectId:
    try:
        return ObjectId(lesson_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid lesson ID."
        )


# Helper: convert MongoDB document to JSON-friendly data
def serialize_lesson(lesson: dict) -> dict:
    lesson["_id"] = str(lesson["_id"])

    for field in ["created_at", "updated_at", "published_at", "uploaded_at"]:
        value = lesson.get(field)

        if isinstance(value, datetime):
            lesson[field] = value.isoformat()

    return lesson


# API 1: GENERATE A NEW DRAFT LESSON
@router.post("/generate")
def generate_lesson_draft(request: LessonRequest):
    title = request.title.strip()
    summary = request.summary.strip()

    if not title or not summary:
        raise HTTPException(
            status_code=422,
            detail="Title and summary cannot be empty."
        )

    try:
        lesson = create_draft(title, summary)

        return {
            "message": "Lesson generated and saved as draft.",
            "lesson": lesson
        }

    except (requests.RequestException, JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="Lesson generation failed. Check Ollama and its output."
        )

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Could not save the lesson to MongoDB."
        )


# API 2: FETCH ALL DRAFT LESSONS
@router.get("/drafts")
def fetch_draft_lessons():
    try:
        lessons = list(
            draft_lessons.find({"status": "draft"})
        )

        return {
            "count": len(lessons),
            "lessons": [
                serialize_lesson(lesson)
                for lesson in lessons
            ]
        }

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Could not fetch draft lessons."
        )


# API 3: EDIT AN EXISTING DRAFT LESSON
@router.put("/drafts/{lesson_id}")
def edit_draft_lesson(
    lesson_id: str,
    request: LessonUpdate
):
    mongo_id = get_lesson_id(lesson_id)

    updates = request.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update."
        )

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Updated fields cannot be null."
        )

    for field in ["title", "summary"]:
        if field in updates:
            updates[field] = updates[field].strip()

            if not updates[field]:
                raise HTTPException(
                    status_code=422,
                    detail=f"{field} cannot be empty."
                )

    updates["updated_at"] = datetime.now(timezone.utc)

    try:
        result = draft_lessons.update_one(
            {"_id": mongo_id, "status": "draft"},
            {"$set": updates}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Draft lesson not found."
            )

        lesson = draft_lessons.find_one({
            "_id": mongo_id,
            "status": "draft"
        })

        return {
            "message": "Draft lesson updated successfully.",
            "lesson": serialize_lesson(lesson)
        }

    except HTTPException:
        raise

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Could not update the draft lesson."
        )


# API 4: DELETE A DRAFT LESSON
@router.delete("/drafts/{lesson_id}")
def delete_draft_lesson(lesson_id: str):
    mongo_id = get_lesson_id(lesson_id)

    try:
        result = draft_lessons.delete_one({
            "_id": mongo_id,
            "status": "draft"
        })

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Draft lesson not found."
            )

        return {
            "message": "Draft lesson deleted successfully.",
            "lesson_id": lesson_id
        }

    except HTTPException:
        raise

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Could not delete the draft lesson."
        )


# API 5: UPLOAD A DRAFT TO UPLOADED LESSONS
@router.post("/drafts/{lesson_id}/upload")
def upload_draft_lesson(lesson_id: str):
    mongo_id = get_lesson_id(lesson_id)

    try:
        lesson = draft_lessons.find_one({
            "_id": mongo_id,
            "status": "draft"
        })

        if lesson is None:
            raise HTTPException(
                status_code=404,
                detail="Draft lesson not found."
            )

        upload_time = datetime.now(timezone.utc)

        lesson["status"] = "uploaded"
        lesson["uploaded_at"] = upload_time
        lesson["updated_at"] = upload_time

        uploaded_lessons.insert_one(lesson)

        result = draft_lessons.delete_one({
            "_id": mongo_id,
            "status": "draft"
        })

        if result.deleted_count != 1:
            uploaded_lessons.delete_one({
                "_id": mongo_id,
                "status": "uploaded"
            })

            raise HTTPException(
                status_code=409,
                detail="Draft changed during upload. Please retry."
            )

        return {
            "message": "Lesson uploaded successfully.",
            "lesson_id": str(mongo_id),
            "status": "uploaded",
            "uploaded_at": upload_time.isoformat()
        }

    except HTTPException:
        raise

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Database error while uploading the lesson."
        )

# API 6: FETCH ALL UPLOADED LESSONS
@router.get("/uploaded")
def fetch_uploaded_lessons():
    try:
        lessons = list(
            uploaded_lessons.find({"status": "uploaded"})
        )

        return {
            "count": len(lessons),
            "lessons": [
                serialize_lesson(lesson)
                for lesson in lessons
            ]
        }

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Could not fetch uploaded lessons."
        )


# API 7: RESTORE AN UPLOADED LESSON TO DRAFTS
@router.post("/uploaded/{lesson_id}/restore")
def restore_uploaded_lesson(lesson_id: str):
    mongo_id = get_lesson_id(lesson_id)

    try:
        # Find the uploaded lesson
        lesson = uploaded_lessons.find_one({
            "_id": mongo_id,
            "status": "uploaded"
        })

        if lesson is None:
            raise HTTPException(
                status_code=404,
                detail="Uploaded lesson not found."
            )

        # Change its status back to draft
        restore_time = datetime.now(timezone.utc)

        lesson["status"] = "draft"
        lesson["updated_at"] = restore_time

        # Insert into the draft collection
        draft_lessons.insert_one(lesson)

        # Remove from uploaded lessons after insertion
        result = uploaded_lessons.delete_one({
            "_id": mongo_id,
            "status": "uploaded"
        })

        if result.deleted_count != 1:
            draft_lessons.delete_one({
                "_id": mongo_id,
                "status": "draft"
            })

            raise HTTPException(
                status_code=409,
                detail="Lesson changed during restoration. Please retry."
            )

        return {
            "message": "Lesson successfully moved back to drafts.",
            "lesson_id": str(mongo_id),
            "status": "draft",
            "updated_at": restore_time.isoformat()
        }

    except HTTPException:
        raise

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Database error while restoring the lesson."
        )
