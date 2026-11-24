import { useEffect, useRef, useState } from 'react'

// Shows your live camera with an oval for your face, and a button under it.
// loading: true while the face is being checked
// onVerify: what happens when you click the button
function FaceCamera({ loading, onVerify, buttonText = 'Verify my face' }) {
  // videoRef lets us reach the <video> element, to put the camera picture in it
  const videoRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')

  // useEffect runs once when the camera box appears on the screen
  useEffect(() => {
    let camera = null
    let closed = false

    // Ask the browser for the camera (the browser asks the user for permission)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        camera = stream
        if (closed) {
          // The camera box was already closed: switch the camera off again
          stream.getTracks().forEach((track) => track.stop())
        } else {
          videoRef.current.srcObject = stream
          setCameraOn(true)
        }
      })
      .catch(() => {
        setCameraError('We need your camera to check it is you. Allow camera access and reload the page.')
      })

    // This part runs when the camera box disappears: switch the camera off
    return () => {
      closed = true
      if (camera) {
        camera.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div>
      <div className="camera">
        <video ref={videoRef} autoPlay playsInline muted />
        <div className="face-frame" />
        {loading && <div className="camera-overlay">Checking…</div>}
      </div>

      {cameraError && <p className="error">{cameraError}</p>}

      <button type="button" className="btn btn-full" onClick={onVerify} disabled={!cameraOn || loading}>
        {loading ? 'Checking…' : buttonText}
      </button>
    </div>
  )
}

export default FaceCamera
