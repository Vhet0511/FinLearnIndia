
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError
from app.routes.quiz import router as quiz_router
from app.database import check_database_connection
from app.routes.lessons import router as lessons_router
from app.routes.ask import router as ask_router
from app.routes.hindi_summary import router as hindi_summary_router

app = FastAPI(
    title="FinLearnIndia API",
    version="1.0.0",
)

# Configure CORS before registering routes.
app.add_middleware(
    CORSMiddleware,
       allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register lesson routes.
app.include_router(lessons_router)
app.include_router(quiz_router)
app.include_router(ask_router)
app.include_router(hindi_summary_router)

@app.get("/")
def health_check():
    try:
        check_database_connection()
    except PyMongoError as exc:
        raise HTTPException(
            status_code=503,
            detail="MongoDB is unavailable.",
        ) from exc

    return {
        "message": "FinLearnIndia backend is running.",
        "database": "connected",
    }
