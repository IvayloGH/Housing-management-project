
import torch
from io import BytesIO
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1

# Use CPU for compatibility
device = torch.device("cpu")

# Face detection model
detector = MTCNN(image_size=160, device=device)

# Face recognition model
model = InceptionResnetV1(
    pretrained="vggface2"
).eval().to(device)


def get_embedding(image_bytes):
    # Convert image bytes into a PIL image
    image = Image.open(BytesIO(image_bytes)).convert("RGB")

    # Detect and extract the face
    face = detector(image)

    if face is None:
        return None

    # Generate face embedding
    with torch.no_grad():
        embedding = model(
            face.unsqueeze(0).to(device)
        )

    # Convert tensor to a Python list
    return embedding.squeeze(0).cpu().tolist()
