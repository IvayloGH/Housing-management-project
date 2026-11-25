import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from deps import UPLOAD_DIR
from routers import auth, chores, expenses, groceries, houses, notifications, tickets, users

app = FastAPI(title="Roomify API")

# The React frontend runs on another address (Vite: http://localhost:5173), so the browser
# needs permission (CORS) to call this API. More addresses: comma-separated in FRONTEND_ORIGINS.
origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins.split(",") if o.strip()],
    allow_methods=["*"],
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
