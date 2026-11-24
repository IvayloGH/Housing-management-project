import { Link } from 'react-router'
import logoDark from '../assets/logo-dark.png'
import logoLight from '../assets/logo-light.png'

// Roomify logo from the Figma design.
// Use light={true} on dark backgrounds (like the login photo).
function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className="logo">
      <img src={light ? logoLight : logoDark} alt="" width="22" height="22" />
      Roomify
    </Link>
  )
}

export default Logo
