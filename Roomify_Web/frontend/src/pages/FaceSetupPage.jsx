
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useUser } from '../api/userContext.js'
import { api, hasToken } from '../api/client.js'
import FaceCamera from '../components/FaceCamera.jsx'

function FaceSetupPage({ preview = false }) {
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')

  const navigate = useNavigate()
  const { user } = useUser()

  function continueToHome() {
    if (preview) {
      navigate('/register', { replace: true })
      return
    }

    navigate(user ? '/' + user.role : '/', { replace: true })
  }

  async function handleRegisterFace(photo) {
    setError('')
    setPreviewMessage('')

    if (!consent) {
      setError('Please give your consent before continuing.')
      return
    }

    if (!photo) {
      setError('Could not capture a photo. Please try again.')
      return
    }

    // Preview mode: only test the camera.
    // No photo is sent to the backend or saved.
    if (preview) {
      setPreviewMessage(
        'Photo captured successfully! Nothing was sent or saved.'
      )
      return
    }

    if (!hasToken()) {
      setError('You must be logged in to register your face.')
      return
    }

    setLoading(true)

    try {
      // Use Roomify's existing API client.
      // It automatically includes the authentication token.
      await api('/auth/face/setup', {
        method: 'POST',
        file: photo,
        fields: { consent: true }
      })

      setSuccess(true)

    } catch (err) {
      if (err.status === 503) {
        setError(
          'Face registration is not available yet. You can skip this step.'
        )
      } else {
        setError(err.message || 'Face registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-body form-page face-setup-compact">

      {/* Styles only apply to this page */}
      <style>{`
        .face-setup-compact {
          width: 100%;
          max-width: 720px;
          margin: 20px auto;
          padding: 0 16px;
          box-sizing: border-box;
        }

        .face-setup-compact .face-setup-card {
          width: 100%;
          padding: 24px;
          box-sizing: border-box;
        }

        .face-setup-compact .face-setup-title {
          margin: 0 0 8px;
          font-size: 24px;
        }

        .face-setup-compact .face-setup-description {
          margin: 0 0 14px;
          color: #666;
          line-height: 1.5;
          font-size: 14px;
        }

        .face-setup-compact .face-setup-preview {
          margin: 0 0 12px;
          font-size: 13px;
          color: #666;
        }

        .face-setup-compact .face-setup-consent {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.5;
          cursor: pointer;
        }

        .face-setup-compact .face-setup-consent input {
          margin-top: 3px;
          flex-shrink: 0;
        }

        /* Make the camera smaller */
        .face-setup-compact .camera {
          width: 100%;
          height: 320px;
          max-height: 38vh;
          min-height: 220px;
          aspect-ratio: auto;
          overflow: hidden;
          position: relative;
          border-radius: 10px;
        }

        .face-setup-compact .camera video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Keep the face guide inside the smaller camera */
        .face-setup-compact .face-frame {
          position: absolute;
          width: 190px;
          height: 76%;
          top: 50%;
          left: 50%;
          right: auto;
          bottom: auto;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
        }

        .face-setup-compact .face-setup-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }

        .face-setup-compact .face-setup-actions .btn {
          padding: 10px 20px;
        }

        .face-setup-compact .face-setup-message {
          margin: 0 0 12px;
          font-size: 14px;
        }

        .face-setup-compact .face-setup-success {
          text-align: center;
          padding: 20px 0;
        }

        @media (max-width: 600px) {
          .face-setup-compact {
            margin: 12px auto;
            padding: 0 10px;
          }

          .face-setup-compact .face-setup-card {
            padding: 18px;
          }

          .face-setup-compact .camera {
            height: 280px;
            max-height: none;
            min-height: 0;
          }

          .face-setup-compact .face-frame {
            width: 160px;
          }

          .face-setup-compact .face-setup-title {
            font-size: 22px;
          }
        }
      `}</style>

      <section className="card face-setup-card">

        <h2 className="face-setup-title">
          Set up Face Login
        </h2>

        {preview && (
          <p className="face-setup-preview">
            Development preview — camera test only.
          </p>
        )}

        {success ? (
          <div className="face-setup-success">
            <h3>Face registered successfully!</h3>

            <p>
              You can now use Face Login to access your account.
            </p>

            <button
              type="button"
              className="btn"
              onClick={continueToHome}
            >
              Continue to Roomify
            </button>
          </div>
        ) : (
          <>
            <p className="face-setup-description">
              Look directly at the camera and keep your face
              inside the oval. Make sure you're in good lighting.
            </p>

            <label className="face-setup-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />

              <span>
                {preview
                  ? 'I agree to test the camera locally without saving my photo.'
                  : 'I consent to the processing and storage of my encrypted facial template for Face Login.'}
              </span>
            </label>

            {error && (
              <p className="error face-setup-message" role="alert">
                {error}
              </p>
            )}

            {previewMessage && (
              <p
                className="face-setup-message"
                role="status"
                style={{ color: '#286341' }}
              >
                {previewMessage}
              </p>
            )}

            <FaceCamera
              loading={loading}
              onVerify={handleRegisterFace}
              buttonText={
                preview ? 'Test photo capture' : 'Register my face'
              }
            />

            <div className="face-setup-actions">
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
