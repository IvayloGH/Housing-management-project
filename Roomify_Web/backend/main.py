import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response

from deps import UPLOAD_DIR
from routers import auth, chores, expenses, groceries, houses, notifications, tickets, users

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

for r in (auth, users, groceries, tickets, chores, houses, expenses, notifications):
    app.include_router(r.router)

# Uploaded ticket photos, e.g. /uploads/tickets/3f2a....jpg
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}


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
