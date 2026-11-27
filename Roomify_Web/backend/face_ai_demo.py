
"""Local-only Roomify AI demo. No database or biometric storage."""

import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse

app = FastAPI(title="Roomify - Face AI Demo")
MAX_BYTES = 5 * 1024 * 1024


@app.get("/", response_class=HTMLResponse)
def homepage():
    return """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Roomify | Face AI Demo</title>
  <style>
    * { box-sizing: border-box; }

    body {
      font-family: system-ui, Arial, sans-serif;
      background: #f5f6f4;
      color: #17241c;
      margin: 0;
      padding: 22px 14px;
    }

    .card {
      max-width: 760px;
      margin: auto;
      padding: 24px;
      background: white;
      border: 1px solid #e1e8e1;
      border-radius: 16px;
    }

    .eyebrow {
      font-size: 12px;
      color: #27623e;
      font-weight: 700;
      letter-spacing: 1.2px;
    }

    h1 { margin: 8px 0; font-size: 26px; }

    p {
      margin: 8px 0 16px;
      line-height: 1.45;
      color: #4c5c50;
    }

    .camera {
      position: relative;
      height: 300px;
      overflow: hidden;
      border-radius: 12px;
      background: #202820;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }

    .oval {
      position: absolute;
      width: 210px;
      height: 250px;
      border: 2px dashed white;
      border-radius: 50%;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 14px 0;
    }

    button {
      border: 0;
      padding: 12px 16px;
      background: #27623e;
      color: white;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    button.secondary {
      background: #e8eee8;
      color: #25412d;
    }

    button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .status {
      font-size: 14px;
      margin: 12px 0;
      min-height: 20px;
    }

    .previews {
      display: flex;
      gap: 12px;
      margin: 14px 0;
    }

    .shot {
      flex: 1;
      background: #f4f7f4;
      border: 1px solid #e3ebe3;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }

    .shot img {
      height: 105px;
      max-width: 100%;
      border-radius: 7px;
      object-fit: cover;
      display: none;
    }

    .shot div {
      font-size: 13px;
      margin-top: 6px;
    }

    .result {
      border: 1px solid #d6e5d8;
      background: #f4faf5;
      border-radius: 10px;
      padding: 15px;
      margin-top: 14px;
    }

    small {
      display: block;
      color: #667568;
      line-height: 1.5;
    }

    @media (max-width: 550px) {
      .card { padding: 16px; }
      .camera { height: 240px; }
      .oval { width: 160px; height: 205px; }
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">ROOMIFY · LOCAL AI DEMO</div>
    <h1>Face Recognition</h1>

    <p>
      Capture two photos. The Python backend uses MTCNN and FaceNet
      to generate 512-value embeddings and compare them.
    </p>

    <div class="camera">
      <video id="video" autoplay playsinline muted></video>
      <div class="oval"></div>
    </div>

    <div class="status" id="status" role="status">
      Starting camera...
    </div>

    <div class="actions">
      <button id="first" disabled>1. Capture first face</button>
      <button id="second" disabled>2. Capture again & compare</button>
      <button id="reset" class="secondary">Reset</button>
    </div>

    <div class="previews">
      <div class="shot">
        <img id="image1" alt="First captured photo" />
        <div>Photo 1</div>
      </div>

      <div class="shot">
        <img id="image2" alt="Second captured photo" />
        <div>Photo 2</div>
      </div>
    </div>

    <section
      class="result"
      id="result"
      hidden
      aria-live="polite">
    </section>

    <small>
      Development demonstration only. Photos are processed in memory,
      not stored in a database. This is not secure authentication.
      Use consenting volunteers only.
    </small>
  </main>

<script>
  const video = document.getElementById('video');
  const statusText = document.getElementById('status');
  const firstBtn = document.getElementById('first');
  const secondBtn = document.getElementById('second');
  const resetBtn = document.getElementById('reset');
  const result = document.getElementById('result');

  let firstPhoto = null;
  let firstUrl = null;
  let secondUrl = null;

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: false
  })
    .then(stream => {
      video.srcObject = stream;
      firstBtn.disabled = false;
      statusText.textContent = 'Camera ready. Capture the first face.';
    })
    .catch(err => {
      statusText.textContent = 'Camera unavailable: ' + err.message;
    });

  function takePhoto() {
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Camera is still starting. Try again.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = Math.round(
      video.videoHeight * 640 / video.videoWidth
    );

    canvas.getContext('2d').drawImage(
      video, 0, 0, canvas.width, canvas.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob
          ? resolve(blob)
          : reject(new Error('Capture failed')),
        'image/jpeg',
        0.9
      );
    });
  }

  function preview(id, blob, previousUrl) {
    if (previousUrl) URL.revokeObjectURL(previousUrl);

    const url = URL.createObjectURL(blob);
    const img = document.getElementById(id);

    img.src = url;
    img.style.display = 'inline-block';

    return url;
  }

  firstBtn.onclick = async () => {
    firstBtn.disabled = true;
    secondBtn.disabled = true;

    try {
      firstPhoto = await takePhoto();
      firstUrl = preview('image1', firstPhoto, firstUrl);

      if (secondUrl) URL.revokeObjectURL(secondUrl);
      secondUrl = null;

      document.getElementById('image2').style.display = 'none';
      result.hidden = true;

      statusText.textContent =
        'Checking the first photo with MTCNN and FaceNet...';

      const form = new FormData();
      form.append('photo', firstPhoto, 'photo.jpg');

      const response = await fetch('/demo/analyze', {
        method: 'POST',
        body: form
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Analysis failed');
      }

      secondBtn.disabled = false;

      statusText.textContent =
        'Face detected! Embedding: ' +
        data.embedding_size +
        ' values. Now take a second photo to compare.';

    } catch (e) {
      statusText.textContent = e.message;
    } finally {
      firstBtn.disabled = false;
    }
  };

  secondBtn.onclick = async () => {
    if (!firstPhoto) return;

    firstBtn.disabled = true;
    secondBtn.disabled = true;

    statusText.textContent =
      'Running MTCNN and FaceNet on both photos...';

    try {
      const secondPhoto = await takePhoto();
      secondUrl = preview('image2', secondPhoto, secondUrl);

      const form = new FormData();
      form.append('photo1', firstPhoto, 'photo1.jpg');
      form.append('photo2', secondPhoto, 'photo2.jpg');

      const response = await fetch('/demo/compare', {
        method: 'POST',
        body: form
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Comparison failed');
      }

      const verdict = data.same_person ? 'MATCH' : 'NO MATCH';

      result.hidden = false;
      result.textContent =
        verdict +
        ' (experimental threshold ' + data.threshold + ')' +
        ' · Cosine similarity: ' + data.similarity.toFixed(4) +
        ' · Embedding: ' + data.embedding_size + ' values' +
        ' · Processing: ' + data.processing_ms + ' ms';

      statusText.textContent =
        'Comparison complete. Try another pair of photos.';

    } catch (e) {
      result.hidden = true;
      statusText.textContent = e.message;
    } finally {
      firstBtn.disabled = false;
      secondBtn.disabled = false;
    }
  };

  resetBtn.onclick = () => {
    firstPhoto = null;

    if (firstUrl) URL.revokeObjectURL(firstUrl);
    if (secondUrl) URL.revokeObjectURL(secondUrl);

    firstUrl = null;
    secondUrl = null;

    for (const id of ['image1', 'image2']) {
      document.getElementById(id).style.display = 'none';
    }

    firstBtn.disabled = !video.srcObject;
    secondBtn.disabled = true;
    result.hidden = true;
    statusText.textContent = 'Ready for another test.';
  };
</script>
</body>
</html>"""


async def image_bytes(upload: UploadFile) -> bytes:
    if upload.content_type not in (
        "image/jpeg",
        "image/png",
        "image/webp"
    ):
        raise HTTPException(
            400,
            "Only JPG, PNG and WebP images are supported."
        )

    data = await upload.read(MAX_BYTES + 1)

    if not data or len(data) > MAX_BYTES:
        raise HTTPException(
            400,
            "Each image must be smaller than 5 MB."
        )

    return data


@app.post("/demo/analyze")
async def analyze(photo: UploadFile = File(...)):
    data = await image_bytes(photo)

    try:
        from ai.face_recognition import get_embedding
    except (ImportError, OSError):
        raise HTTPException(
            503,
            "AI dependencies unavailable. Check your Python environment."
        )

    try:
        embedding = get_embedding(data)
    except (OSError, ValueError):
        raise HTTPException(400, "Could not read the photo.")

    if embedding is None:
        raise HTTPException(
            422,
            "No clear face detected. Look at the camera in good light."
        )

    return {
        "face_detected": True,
        "embedding_size": len(embedding)
    }


@app.post("/demo/compare")
async def compare(
    photo1: UploadFile = File(...),
    photo2: UploadFile = File(...)
):
    start = time.perf_counter()

    first = await image_bytes(photo1)
    second = await image_bytes(photo2)

    try:
        import torch
        from ai.face_recognition import get_embedding, is_same_person
    except (ImportError, OSError):
        raise HTTPException(
            503,
            "AI dependencies unavailable. Check your Python environment."
        )

    try:
        a = get_embedding(first)
        b = get_embedding(second)
    except (OSError, ValueError):
        raise HTTPException(400, "Could not read one of the photos.")

    if a is None or b is None:
        which = "first" if a is None else "second"
        raise HTTPException(
            422,
            f"No clear face detected in the {which} photo."
        )

    similarity = torch.nn.functional.cosine_similarity(
        torch.tensor(a, dtype=torch.float32).unsqueeze(0),
        torch.tensor(b, dtype=torch.float32).unsqueeze(0)
    ).item()

    return {
        "same_person": is_same_person(a, b),
        "similarity": similarity,
        "threshold": 0.70,
        "embedding_size": len(a),
        "processing_ms": round(
            (time.perf_counter() - start) * 1000
        )
    }
