
from pymongo import MongoClient

# Connect to the local MongoDB server
client = MongoClient(
    "mongodb://127.0.0.1:27017/",
    serverSelectionTimeoutMS=5000
)

try:
    # Verify the connection
    client.admin.command("ping")
    print("MongoDB connected successfully!")

    # Select the database
    db = client["finlearnindia"]

    # Create the draft collection if it doesn't exist
    if "draft_lessons" not in db.list_collection_names():
        db.create_collection("draft_lessons")

    print("Database: finlearnindia")
    print("Collection: draft_lessons")
    print("Setup completed successfully!")

finally:
    client.close()
