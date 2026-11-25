import { useState } from 'react'
import { Link } from 'react-router'
import { requestPasswordReset, verifyFace, resetPassword } from '../api/auth.js'
import Logo from '../components/Logo.jsx'
import FaceCamera from '../components/FaceCamera.jsx'
import Icon from '../components/Icon.jsx'

// The page goes through these steps: 'email' → 'face' → 'password' → 'done'
function ForgotPasswordPage() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: send the reset email
  async function handleEmail(event) {
    event.preventDefault()
    setLoading(true)
    await requestPasswordReset(email)
    setLoading(false)
    setStep('face')
  }

  // Step 2: check the face
  async function handleFace() {
    setLoading(true)
    await verifyFace(email)
    setLoading(false)
    setStep('password')
  }

  // Step 3: save the new password
  async function handlePassword(event) {
    event.preventDefault()
    setError('')
    if (password !== repeatPassword) {
      setError('The passwords are not the same')
      return
    }
    setLoading(true)
    try {
      await resetPassword(email, password)
      setStep('done')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <Logo light />

      <div className="login-card">
        {step === 'email' && (
          <form onSubmit={handleEmail}>
            <p className="step-label">Step 1 of 3</p>
            <h2>Forgot your password?</h2>
            <p className="card-text">
              Enter your email. We will send you a link to reset your password.
            </p>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        {step === 'face' && (
          <div>
            <p className="step-label">Step 2 of 3</p>
            <h2>Is it really you?</h2>
            <p className="card-text">
              We sent an email to <strong>{email}</strong>. Look at the camera to
              confirm it's you.
            </p>
            <FaceCamera loading={loading} onVerify={handleFace} />
          </div>
        )}

        {step === 'password' && (
          <form onSubmit={handlePassword}>
            <p className="step-label">Step 3 of 3</p>
            <p className="success"><Icon name="check" /> It's you</p>
            <h2>Choose a new password</h2>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="repeat">Repeat new password</label>
              <input
                id="repeat"
                type="password"
                placeholder="Type it again"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn btn-full" disabled={loading}>
              {loading ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div>
            <p className="success"><Icon name="check" /> Password changed</p>
            <h2>All set.</h2>
            <p className="card-text">You can now sign in with your new password.</p>
            <Link to="/" className="btn btn-full">Back to sign in</Link>
          </div>
        )}

        {step !== 'done' && (
          <p className="login-footer">
            Remembered it? <Link to="/">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage
