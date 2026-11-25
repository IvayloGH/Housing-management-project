import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'

// Forgot password is not available yet: the backend can't send reset emails.
// The old page pretended it worked ("Password changed") without changing anything,
// so for now it only says how to get a new password.
// The design (email -> face check -> new password) is in the backup folder
// frontend_backup_2026-11-25/src/pages/ForgotPasswordPage.jsx.
function ForgotPasswordPage() {
  return (
    <div className="login-page">
      <Logo light />

      <div className="login-card">
        <h2>Forgot your password?</h2>
        <p className="card-text">
          Resetting your password online isn't available yet.
          Ask your property manager or the Roomify team to set a new password for you.
          After that you can change it yourself on your profile page.
        </p>
        <Link to="/" className="btn btn-full">Back to sign in</Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
