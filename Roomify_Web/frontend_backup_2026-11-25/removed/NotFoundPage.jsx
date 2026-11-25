import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import { useUser } from '../api/userContext.js'

// Shown for an address that doesn't exist, e.g. /tenant/typo
function NotFoundPage() {
  const { user } = useUser()
  const home = user ? '/' + user.role : '/'
  return (
    <div>
      <header className="app-header">
        <Logo to={home} />
      </header>
      <section className="not-found">
        <h1>Page not found.</h1>
        <p>This page doesn't exist. Maybe the link is old or has a typo.</p>
        <Link to={home} className="btn">{user ? 'Go to your home page' : 'Go to sign in'}</Link>
      </section>
    </div>
  )
}

export default NotFoundPage
