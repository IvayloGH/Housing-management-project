
from fastapi import FastAPI, UploadFile, File, HTTPException
from ai.face_recognition import get_embedding
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Face Recognition - Local Test")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_methods=["POST"],
    allow_headers=["*"]
)


@app.post("/face/test")
async def test_face(file: UploadFile = File(...)):
    image_bytes = await file.read()

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
