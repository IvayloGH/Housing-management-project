import os

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
# Switched off for now: routers/face.py (Manuel's test endpoint) loads torch at startup,
# which is not installed, so the whole app crashed. Turn back on when Manuel is here.
# from routers.face import router as face_router

from database import get_db
from deps import UPLOAD_DIR
from routers import auth, chores, expenses, face_login, groceries, houses, notifications, tickets, users

app = FastAPI(title="Roomify API")

# The React frontend runs on another address (Vite: http://localhost:5173), so the browser
# needs permission (CORS) to call this API. More addresses: comma-separated in FRONTEND_ORIGINS.
origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins.split(",") if o.strip()],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

for r in (auth, face_login, users, groceries, tickets, chores, houses, expenses, notifications):
    app.include_router(r.router)

# app.include_router(face_router)  # see the note at the top

# Uploaded ticket photos, e.g. /uploads/tickets/3f2a....jpg
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    """Can the API reach the database? Opening this also wakes up the serverless Azure SQL database.
    If it says 'not reachable', wait a minute and try again (the database takes ~1 minute to wake up)."""
    try:
        db.execute(text("SELECT 1"))
    except DBAPIError:
        # no details here: this page is public
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "Database not reachable yet. It may be waking up: try again in a minute.")
    return {"database": "ok"}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
    if request.url.path.startswith(("/auth/", "/users/")):
        response.headers["Cache-Control"] = "no-store"
    return response
