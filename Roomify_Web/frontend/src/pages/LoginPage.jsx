import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { login } from '../api/auth.js'
import { useUser } from '../api/userContext.js'
import { FACE_LOGIN_ENABLED } from '../config.js'
import Logo from '../components/Logo.jsx'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { user, setUser } = useUser()

  // Already logged in: go straight to your own home page
  if (user) {
    return <Navigate to={'/' + user.role} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      // Saving the user makes this page go to the user's home page (see above)
      setUser(await login(email, password))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <Logo light />

      <div className="login-welcome">
        <h1>Welcome to Roomify.</h1>
        <p>Everything about your home, in one place.</p>
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Sign in</h2>

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

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Link to="/forgot-password" className="forgot">Forgot your password?</Link>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        {/* Hidden until face login works in the backend (see config.js) */}
        {FACE_LOGIN_ENABLED && (
          <>
            <div className="divider">or</div>
            <Link to="/face-login" className="btn btn-light btn-full">
              Log in with face recognition
            </Link>
          </>
        )}

        <p className="login-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
