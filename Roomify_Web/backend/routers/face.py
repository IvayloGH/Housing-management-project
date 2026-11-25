
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException

from models import User
from security import get_current_user
from ai.face_recognition import get_embedding


router = APIRouter(
    prefix="/face",
    tags=["Face"]
)


@router.post("/test")
def test_face(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    image_bytes = file.file.read()

    try:
        embedding = get_embedding(image_bytes)

    except (OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image"
        )

    if embedding is None:
        raise HTTPException(
            status_code=400,
            detail="No face detected"
        )

    return {
        "face_detected": True,
        "embedding_size": len(embedding)
    }
