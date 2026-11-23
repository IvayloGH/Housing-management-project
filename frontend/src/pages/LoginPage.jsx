import { useState } from 'react'
import { useNavigate } from 'react-router'
import { login } from '../api/auth.js'
import Logo from '../components/Logo.jsx'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    try {
      const user = login(email, password)
      navigate('/' + user.role)
    } catch (err) {
      setError(err.message)
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

        <a href="#" className="forgot">Forgot your password?</a>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-full">Sign in</button>

        <div className="divider">or</div>

        <button type="button" className="btn btn-light btn-full">
          Sign in with face recognition
        </button>

        <p className="login-footer">
          New here? <a href="#">Create an account</a>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
