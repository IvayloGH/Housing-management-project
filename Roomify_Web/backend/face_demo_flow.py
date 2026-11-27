
"""
Roomify - Local Face Login Flow Demo

Uses Manuel's real MTCNN + FaceNet implementation.

Demo flow:
1. Enroll a face
2. Keep the 512-value embedding in server memory
3. Simulate logout
4. Capture another photo and verify the face

No database, no JWT, no persistent biometric storage.

LOCAL DEVELOPMENT ONLY - NOT PRODUCTION AUTHENTICATION.
"""

import math
import time
from threading import Lock

from fastapi import File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Reuse the already working FastAPI demonstration.
# This preserves its original endpoints and homepage.
from face_ai_demo import app

MAX_PHOTO_BYTES = 5 * 1024 * 1024
THRESHOLD = 0.70

# One temporary enrolled face for this local demo.
# This is intentionally NOT connected to Roomify accounts.
saved_embedding = None
embedding_lock = Lock()

# Allow the local React development server to call this API.
# Avoid adding CORS twice if face_ai_demo.py already has it.
if not any(
    middleware.cls is CORSMiddleware
    for middleware in app.user_middleware
):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        allow_methods=["GET", "POST"],
        allow_headers=["*"]
    )


def read_photo(file: UploadFile) -> bytes:
    """Read and validate a webcam photo."""

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="The photo must be JPG, PNG or WebP."
        )

    photo = file.file.read(MAX_PHOTO_BYTES + 1)

    if not photo or len(photo) > MAX_PHOTO_BYTES:
        raise HTTPException(
            status_code=400,
            detail="The photo must be smaller than 5 MB."
        )

    return photo


def create_embedding(photo: bytes) -> list[float]:
    """
    Run Manuel's real face recognition model.

    MTCNN detects and extracts the face.
    FaceNet produces a 512-dimensional embedding.
    """

    try:
        from ai.face_recognition import get_embedding
    except (ImportError, OSError) as exc:
        raise HTTPException(
            status_code=503,
            detail="The AI dependencies are not available."
        ) from exc

    try:
        embedding = get_embedding(photo)
    except (OSError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail="The photo could not be processed."
        ) from exc

    if embedding is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "No clear face detected. "
                "Look straight at the camera in good lighting."
            )
        )

    if (
        len(embedding) != 512
        or not all(math.isfinite(x) for x in embedding)
    ):
        raise HTTPException(
            status_code=500,
            detail="The AI generated an invalid embedding."
        )

    return embedding


def calculate_similarity(a: list[float], b: list[float]) -> float:
    """Calculate cosine similarity for display in the demo."""

    dot_product = sum(x * y for x, y in zip(a, b))

    length_a = math.sqrt(sum(x * x for x in a))
    length_b = math.sqrt(sum(y * y for y in b))

    if length_a == 0 or length_b == 0:
        raise HTTPException(
            status_code=500,
            detail="Cannot compare invalid embeddings."
        )

    return dot_product / (length_a * length_b)


@app.get("/demo/flow/status")
def demo_status():
    """Check whether a face has already been enrolled."""

    with embedding_lock:
        enrolled = saved_embedding is not None

    return {
        "enrolled": enrolled,
        "mode": "local_demo"
    }


@app.post("/demo/flow/enroll")
def demo_enroll(
    photo: UploadFile = File(...),
    consent: bool = Form(False)
):
    """
    Register one face temporarily.

    The embedding is saved only in Python process memory.
    No photograph or embedding is written to a database.
    """

    global saved_embedding

    if not consent:
        raise HTTPException(
            status_code=400,
            detail="Consent is required before enrolling a face."
        )

    start = time.perf_counter()

    image_bytes = read_photo(photo)
    embedding = create_embedding(image_bytes)

    # Replace any previously enrolled face.
    with embedding_lock:
        saved_embedding = embedding

    processing_ms = round(
        (time.perf_counter() - start) * 1000
    )

    return {
        "enrolled": True,
        "face_detected": True,
        "embedding_size": len(embedding),
        "processing_ms": processing_ms,
        "message": "Face enrolled successfully in temporary memory."
    }


@app.post("/demo/flow/verify")
def demo_verify(photo: UploadFile = File(...)):
    """
    Compare a webcam photo with the enrolled embedding.

    This is only an identity-matching demonstration.
    It does not create a Roomify login session.
    """

    start = time.perf_counter()

    with embedding_lock:
        if saved_embedding is None:
            raise HTTPException(
                status_code=409,
                detail="Register a face before trying to log in."
            )

        reference_embedding = saved_embedding.copy()

    image_bytes = read_photo(photo)
    current_embedding = create_embedding(image_bytes)

    from ai.face_recognition import is_same_person

    similarity = calculate_similarity(
        reference_embedding,
        current_embedding
    )

    same_person = is_same_person(
        reference_embedding,
        current_embedding,
        threshold=THRESHOLD
    )

    processing_ms = round(
        (time.perf_counter() - start) * 1000
    )

    return {
        "same_person": same_person,
        "similarity": round(similarity, 6),
        "threshold": THRESHOLD,
        "embedding_size": len(current_embedding),
        "processing_ms": processing_ms,
        "demo_only": True
    }


@app.post("/demo/flow/reset")
def demo_reset():
    """Remove the temporary embedding from memory."""

    global saved_embedding

    with embedding_lock:
        saved_embedding = None

    return {
        "enrolled": False,
        "message": "Temporary face enrollment cleared."
    }
