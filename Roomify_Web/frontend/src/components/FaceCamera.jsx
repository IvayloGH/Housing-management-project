
import { useEffect, useRef, useState } from 'react'

// Shows the live camera with an oval for the user's face.
// loading: true while the face is being processed.
// onVerify(photo): receives a JPEG photo captured from the camera.
function FaceCamera({ loading, onVerify, buttonText = 'Verify my face' }) {
  const videoRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')

  // Check camera support outside useEffect to avoid ESLint errors.
  // Safari on iPhone requires HTTPS for non-localhost addresses.
  const cameraSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'

  useEffect(() => {
    let camera = null
    let closed = false

    // If camera access is unavailable, do not attempt to open it.
    if (!cameraSupported) {
      return
    }

    // Request access to the front camera.
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      })
      .then((stream) => {
        camera = stream

        // Stop the camera if the component was already closed.
        if (closed || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        // Display the camera feed.
        videoRef.current.srcObject = stream
        setCameraOn(true)
        setCameraError('')
      })
      .catch(() => {
        if (!closed) {
          setCameraOn(false)
          setCameraError(
            'Could not access the camera. Check your camera permissions or use HTTPS.'
          )
        }
      })

    // Stop the camera when leaving the page.
    return () => {
      closed = true

      if (camera) {
        camera.getTracks().forEach((track) => track.stop())
      }
    }
  }, [cameraSupported])

  // Capture a JPEG photo from the camera.
  function takePhoto() {
    const video = videoRef.current

    // Make sure the camera is ready.
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is not ready yet. Please try again.')
      return
    }

    const canvas = document.createElement('canvas')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      setCameraError('Could not capture the image.')
      return
    }

    // Draw the current camera frame.
    context.drawImage(video, 0, 0)

    // Convert the frame into a JPEG photo.
    canvas.toBlob(
      (photo) => {
        if (!photo) {
          setCameraError('Photo capture failed. Please try again.')
          return
        }

        // Send the photo to the parent component.
        onVerify(photo)
      },
      'image/jpeg',
      0.9
    )
  }

  // Show a message if the browser does not support camera access.
  const displayedError = !cameraSupported
    ? 'Camera access is not available. On mobile devices, please use an HTTPS connection.'
    : cameraError

  return (
    <div>
      <div className="camera">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />

        <div className="face-frame" />

        {loading && (
          <div className="camera-overlay">
            Checking…
          </div>
        )}
      </div>

      {displayedError && (
        <p className="error" role="alert">
          {displayedError}
        </p>
      )}

      <button
        type="button"
        className="btn btn-full"
        onClick={takePhoto}
        disabled={!cameraOn || loading || !cameraSupported}
      >
        {loading ? 'Checking…' : buttonText}
      </button>
    </div>
  )
}

export default FaceCamera
