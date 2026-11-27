
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import FaceCamera from '../components/FaceCamera.jsx'

// Separate local demo backend.
// The real Roomify API remains unchanged.
const DEMO_API = ''

async function demoRequest(path, { method = 'GET', photo, consent } = {}) {
  const options = { method }

  if (photo) {
    const formData = new FormData()
    formData.append('photo', photo, 'face.jpg')

    if (consent) {
      formData.append('consent', 'true')
    }

    options.body = formData
  }

  let response

  try {
    response = await fetch(DEMO_API + path, options)
  } catch {
    throw new Error(
      'Cannot connect to the local AI server. Make sure face_demo_flow.py is running on port 8001.'
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'Something went wrong while processing the face.'
    )
  }

  return data
}

function FaceDemoPage() {
  const [step, setStep] = useState('loading')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [enrollInfo, setEnrollInfo] = useState(null)

  // Restore the demonstration state if the page is refreshed.
  useEffect(() => {
    let active = true

    demoRequest('/demo/flow/status')
      .then((data) => {
        if (active) {
          setStep(data.enrolled ? 'registered' : 'enroll')
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
          setStep('enroll')
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function handleCapture(photo) {
    setError('')
    setMessage('')

    if (!photo) {
      setError('Could not capture a photo. Please try again.')
      return
    }

    setLoading(true)

    try {
      if (step === 'enroll') {
        // Register the face in temporary Python memory.
        const data = await demoRequest('/demo/flow/enroll', {
          method: 'POST',
          photo,
          consent: true
        })

        setEnrollInfo(data)
        setMessage(
          'Your face was detected and its embedding was saved in temporary server memory.'
        )
        setStep('registered')
      }

      else if (step === 'login') {
        // Generate a new embedding and compare it with the saved one.
        const data = await demoRequest('/demo/flow/verify', {
          method: 'POST',
          photo
        })

        setResult(data)
        setStep('result')
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function simulateLogout() {
    // This only changes the demo screen.
    // The enrolled embedding stays in temporary Python memory.
    setError('')
    setMessage('')
    setResult(null)
    setStep('login')
  }

  function retryLogin() {
    setError('')
    setMessage('')
    setResult(null)
    setStep('login')
  }

  async function resetDemo() {
    setLoading(true)
    setError('')

    try {
      await demoRequest('/demo/flow/reset', {
        method: 'POST'
      })

      setResult(null)
      setEnrollInfo(null)
      setMessage('')
      setStep('enroll')

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-body form-page face-flow-demo">

      <style>{`
        .face-flow-demo {
          width: 100%;
          max-width: 720px;
          margin: 16px auto;
          padding: 0 14px;
          box-sizing: border-box;
        }

        .face-flow-demo .demo-card {
          width: 100%;
          box-sizing: border-box;
          padding: 22px;
        }

        .face-flow-demo .demo-eyebrow {
          color: #286341;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .face-flow-demo h2 {
          margin: 0 0 8px;
          font-size: 25px;
        }

        .face-flow-demo .demo-description {
          color: #666;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 14px;
        }

        .face-flow-demo .demo-steps {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .face-flow-demo .demo-step {
          flex: 1;
          text-align: center;
          padding: 9px 5px;
          font-size: 12px;
          font-weight: 600;
          background: #edf1ed;
          color: #657369;
          border-radius: 8px;
        }

        .face-flow-demo .demo-step.active {
          background: #e0f0e2;
          color: #246037;
        }

        .face-flow-demo .camera {
          width: 100%;
          height: 260px;
          max-height: 35vh;
          min-height: 190px;
          aspect-ratio: auto;
          position: relative;
          overflow: hidden;
          border-radius: 10px;
        }

        .face-flow-demo .camera video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .face-flow-demo .face-frame {
          position: absolute;
          width: 180px;
          height: 78%;
          top: 50%;
          left: 50%;
          right: auto;
          bottom: auto;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
        }

        .face-flow-demo .demo-panel {
          padding: 16px;
          margin: 14px 0;
          background: #f3f8f4;
          border: 1px solid #d6e5d8;
          border-radius: 10px;
        }

        .face-flow-demo .demo-panel h3 {
          font-size: 20px;
          margin: 0 0 9px;
        }

        .face-flow-demo .demo-panel p {
          font-size: 14px;
          margin: 6px 0;
          line-height: 1.5;
        }

        .face-flow-demo .demo-error {
          margin: 10px 0;
        }

        .face-flow-demo .demo-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .face-flow-demo .demo-actions .btn {
          flex: 1;
          min-width: 130px;
        }

        .face-flow-demo .demo-secondary {
          background: #e7ede8;
          color: #285d38;
        }

        .face-flow-demo .demo-back {
          display: inline-block;
          margin-top: 12px;
          color: #286341;
          font-size: 13px;
        }

        @media (max-width: 600px) {
          .face-flow-demo .demo-card {
            padding: 16px;
          }

          .face-flow-demo .camera {
            height: 240px;
            max-height: none;
            min-height: 0;
          }

          .face-flow-demo .face-frame {
            width: 155px;
          }

          .face-flow-demo h2 {
            font-size: 22px;
          }
        }
      `}</style>

      <section className="card demo-card">

        <div className="demo-eyebrow">
          ROOMIFY · AI DEVELOPMENT DEMO
        </div>

        <h2>Face Login Simulation</h2>

        <div className="demo-steps">
          <div className={`demo-step ${
            step === 'enroll' ? 'active' : ''
          }`}>
            1. Register Face
          </div>

          <div className={`demo-step ${
            step === 'registered' ? 'active' : ''
          }`}>
            2. Logout
          </div>

          <div className={`demo-step ${
            step === 'login' || step === 'result' ? 'active' : ''
          }`}>
            3. Face Login
          </div>
        </div>

        {error && (
          <p className="error demo-error" role="alert">
            {error}
          </p>
        )}

        {step === 'loading' && (
          <p>Connecting to the local AI server...</p>
        )}

        {/* STEP 1 - ENROLLMENT */}
        {step === 'enroll' && (
          <>
            <p className="demo-description">
              Look directly at the camera. Your face embedding
              will be kept temporarily in Python memory.
            </p>

            <FaceCamera
              loading={loading}
              onVerify={handleCapture}
              buttonText="Register my face"
            />
          </>
        )}

        {/* STEP 2 - FACE REGISTERED */}
        {step === 'registered' && (
          <>
            <div className="demo-panel">
              <h3 style={{ color: '#286341' }}>
                Face registered successfully!
              </h3>

              <p>
                MTCNN detected your face and FaceNet generated
                a 512-dimensional embedding.
              </p>

              <p>
                <strong>Storage:</strong> Temporary server memory
              </p>

              {enrollInfo && (
                <p>
                  <strong>Processing time:</strong>{' '}
                  {enrollInfo.processing_ms} ms
                </p>
              )}
            </div>

            {message && (
              <p className="demo-description" role="status">
                {message}
              </p>
            )}

            <div className="demo-actions">
              <button
                type="button"
                className="btn"
                onClick={simulateLogout}
              >
                Simulate Logout
              </button>

              <button
                type="button"
                className="btn demo-secondary"
                onClick={resetDemo}
                disabled={loading}
              >
                Start Over
              </button>
            </div>
          </>
        )}

        {/* STEP 3 - FACE VERIFICATION */}
        {step === 'login' && (
          <>
            <p className="demo-description">
              You have simulated logging out. Now capture
              your face again to compare it with the embedding
              registered in Step 1.
            </p>

            <FaceCamera
              loading={loading}
              onVerify={handleCapture}
              buttonText="Verify my face"
            />

            <div className="demo-actions">
              <button
                type="button"
                className="btn demo-secondary"
                onClick={resetDemo}
                disabled={loading}
              >
                Start Over
              </button>
            </div>
          </>
        )}

        {/* RESULT */}
        {step === 'result' && result && (
          <>
            <div className="demo-panel">
              <h3
                style={{
                  color: result.same_person
                    ? '#286341'
                    : '#b45309'
                }}
              >
                {result.same_person ? 'MATCH' : 'NO MATCH'}
              </h3>

              <p>
                {result.same_person
                  ? 'The captured face matches the temporarily registered face.'
                  : 'The captured face did not match the registered face.'}
              </p>

              <p>
                <strong>Cosine similarity:</strong>{' '}
                {result.similarity.toFixed(4)}
              </p>

              <p>
                <strong>Experimental threshold:</strong>{' '}
                {result.threshold}
              </p>

              <p>
                <strong>Embedding dimensions:</strong>{' '}
                {result.embedding_size}
              </p>

              <p>
                <strong>Processing time:</strong>{' '}
                {result.processing_ms} ms
              </p>
            </div>

            <div className="demo-actions">
              <button
                type="button"
                className="btn"
                onClick={retryLogin}
              >
                Try Again
              </button>

              <button
                type="button"
                className="btn demo-secondary"
                onClick={resetDemo}
                disabled={loading}
              >
                Start Over
              </button>
            </div>
          </>
        )}

        <Link to="/" className="demo-back">
          Back to Roomify
        </Link>

      </section>
    </div>
  )
}

export default FaceDemoPage
