
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


# NEW FUNCTION: Compare two facial embeddings
def is_same_person(a, b, threshold=0.70):
    """
    Compare two facial embeddings using cosine similarity.

    a: First facial embedding (512 values)
    b: Second facial embedding (512 values)
    threshold: Minimum similarity required for a match

    Returns True if the embeddings match, otherwise False.
    """

    # Validate embedding dimensions
    if len(a) != 512 or len(b) != 512:
        raise ValueError("Embeddings must contain 512 values")

    # Convert embeddings into PyTorch tensors
    embedding_a = torch.tensor(
        a, dtype=torch.float32
    ).unsqueeze(0)

    embedding_b = torch.tensor(
        b, dtype=torch.float32
    ).unsqueeze(0)

    # Calculate cosine similarity
    similarity = torch.nn.functional.cosine_similarity(
        embedding_a,
        embedding_b
    ).item()

    # Compare similarity against the threshold
    return similarity >= threshold
