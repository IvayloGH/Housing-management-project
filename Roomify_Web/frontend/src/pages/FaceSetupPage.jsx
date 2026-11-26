
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useUser } from '../api/userContext.js'
import { API_URL } from '../api/client.js'
import FaceCamera from '../components/FaceCamera.jsx'

// NEW: Optional preview mode for local development
function FaceSetupPage({ preview = false }) {
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // NEW: Preview feedback
  const [previewMessage, setPreviewMessage] = useState('')

  const navigate = useNavigate()
  const { user } = useUser()

  // Continue to the user's normal homepage
  function continueToHome() {
    // NEW: Preview mode returns to the register page
    if (preview) {
      navigate('/register', { replace: true })
      return
    }

    navigate('/' + user.role, { replace: true })
  }

  // Receive the photo captured by FaceCamera
  async function handleRegisterFace(photo) {
    setError('')
    setPreviewMessage('')

    if (!consent) {
      setError('Please give your consent before registering your face.')
      return
    }

    if (!photo) {
      setError('Could not capture a photo. Please try again.')
      return
    }

    // NEW: Test photo capture without contacting the backend
    if (preview) {
      setPreviewMessage(
        'Photo captured successfully! Preview mode: nothing was sent or saved.'
      )
      return
    }

    setLoading(true)

    try {
      // Create multipart form data
      const formData = new FormData()
      formData.append('file', photo, 'face.jpg')
      formData.append('consent', 'true')

      // Use the existing login token
      const token = localStorage.getItem('roomify-token')

      if (!token) {
        throw new Error('You must be logged in to register your face.')
      }

      // Send the photo to the backend
      const response = await fetch(API_URL + '/auth/face/setup', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token
        },
        body: formData
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))

        if (response.status === 503) {
          throw new Error(
            'Face registration is not available yet. You can skip this step.'
          )
        }

        throw new Error(
          data.detail || 'Face registration failed. Please try again.'
        )
      }

      // Only show success after backend confirmation
      setSuccess(true)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-body form-page">
      <section className="card">
        <h2>Set up Face Login</h2>

        {/* NEW: Clearly identify preview mode */}
        {preview && (
          <p className="card-text">
            Development preview — no account or database required.
          </p>
        )}

        {success ? (
          <>
            <p>
              Your face has been registered successfully!
              You can now continue to Roomify.
            </p>

            <button
              type="button"
              className="btn"
              onClick={continueToHome}
            >
              Continue to Roomify
            </button>
          </>
        ) : (
          <>
            <p>
              Register your face to make future logins easier.
              Look directly at the camera in good lighting.
            </p>

            <p>
              Roomify will process your photo to generate
              a facial template for identification.
            </p>

            <div style={{ margin: '20px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                {' '}
                {preview
                  ? 'I agree to test the camera locally without saving my photo.'
                  : 'I consent to the processing and storage of my facial template for Face Login.'}
              </label>
            </div>

            {error && (
              <p className="error">{error}</p>
            )}

            {/* NEW: Feedback after capturing a photo in preview mode */}
            {previewMessage && (
              <p className="card-text">{previewMessage}</p>
            )}

            <FaceCamera
              loading={loading}
              onVerify={handleRegisterFace}
              buttonText={preview ? 'Test photo capture' : 'Register my face'}
            />

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn"
                onClick={continueToHome}
                disabled={loading}
              >
                Skip for now
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default FaceSetupPage
