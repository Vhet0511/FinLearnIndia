from pymongo import MongoClient
from app.config import (
    MONGODB_URI,
    DATABASE_NAME,
    DRAFT_COLLECTION
)

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000
)

database = client[DATABASE_NAME]
draft_lessons = database["draft_lessons"]
uploaded_lessons = database["uploaded_lessons"]


def check_database_connection():
    client.admin.command("ping")