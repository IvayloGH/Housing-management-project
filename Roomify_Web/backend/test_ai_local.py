
from pathlib import Path
from ai.face_recognition import get_embedding

# Photograph used for testing
photo_path = (
    Path.home()
    / "Projects"
    / "FaceRecognition_PyTorch"
    / "photos"
    / "registered.png"
)

if not photo_path.exists():
    print("ERROR: Test photograph not found!")
    print("Expected location:", photo_path)
else:
    # Read the photograph
    image_bytes = photo_path.read_bytes()

    # Generate the facial embedding
    embedding = get_embedding(image_bytes)

    if embedding is None:
        print("ERROR: No face detected!")
    else:
        print("Face detected successfully!")
        print("Embedding size:", len(embedding))
