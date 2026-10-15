
from pydantic import BaseModel, Field


class LessonRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=3000)


class LessonUpdate(BaseModel):
    title: str | None = Field(
        default=None, min_length=1, max_length=200
    )
    summary: str | None = Field(
        default=None, min_length=1, max_length=3000
    )
    content: str | None = None
    bullet_points: list[str] | None = None
    notes: list[str] | None = None
