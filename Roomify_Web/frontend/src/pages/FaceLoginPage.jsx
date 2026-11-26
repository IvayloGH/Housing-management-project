import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { faceLogin } from '../api/auth.js'
import { useUser } from '../api/userContext.js'
import { FACE_LOGIN_ENABLED } from '../config.js'
import Logo from '../components/Logo.jsx'
import FaceCamera from '../components/FaceCamera.jsx'

// Log in with face recognition: no email needed, the camera finds out who you are
function FaceLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, setUser } = useUser()

  if (user) {
    return <Navigate to={'/' + user.role} replace />
  }

  async function handleFace(photo) {
    setError('')
    setLoading(true)
    try {
      setUser(await faceLogin(photo))
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Logo light />

      <div className="login-card">
        <h2>Log in with your face</h2>
        {FACE_LOGIN_ENABLED ? (
          <>
            <p className="card-text">Look at the camera and keep your face inside the oval.</p>
            {error && <p className="error">{error}</p>}
            <FaceCamera loading={loading} onVerify={handleFace} buttonText="Log in" />
          </>
        ) : (
          <p className="card-text">Face login isn't available yet. Please log in with your password.</p>
        )}

        <p className="login-footer">
          Rather use your password? <Link to="/">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default FaceLoginPage
