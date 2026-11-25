import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import Logo from './Logo.jsx'
import NotificationBell from './NotificationBell.jsx'
import { logout } from '../api/auth.js'
import Icon from './Icon.jsx'

// Menu items per role, from the Figma design.
// For now the role comes from the URL (/tenant, /manager, /technician).
// In step 2 it will come from the logged-in user instead.
// "short" and "icon" are used in the bottom tab bar on phones.
const menus = {
  tenant: [
    { to: '/tenant', label: 'Home', short: 'Home', icon: 'house' },
    { to: '/tenant/schedule', label: 'Cleaning schedule', short: 'Schedule', icon: 'calendar' },
    { to: '/tenant/groceries', label: 'Shared groceries', short: 'Groceries', icon: 'basket' },
    { to: '/tenant/report', label: 'Report a problem', short: 'Report', icon: 'wrench' },
    { to: '/tenant/profile', label: 'My profile', short: 'Profile', icon: 'user' },
  ],
  manager: [
    { to: '/manager', label: 'Overview', short: 'Overview', icon: 'clipboard' },
    { to: '/manager/review', label: 'Review & assign', short: 'Review', icon: 'message' },
    { to: '/manager/houses', label: 'Houses & team', short: 'Houses', icon: 'house' },
    { to: '/manager/profile', label: 'My profile', short: 'Profile', icon: 'user' },
  ],
  technician: [
    { to: '/technician', label: 'My jobs', short: 'Jobs', icon: 'wrench' },
    { to: '/technician/done', label: 'Work done', short: 'Done', icon: 'clock' },
    { to: '/technician/profile', label: 'My profile', short: 'Profile', icon: 'user' },
  ],
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const role = location.pathname.split('/')[1]
  const menu = menus[role] || []

  return (
    <div className="app-layout">
      <header className="app-header">
        <Logo to={'/' + role} />

        <nav className="app-nav">
          {menu.map((item) => (
            <NavLink key={item.to} to={item.to} end>
              <Icon name={item.icon} size={22} strokeWidth={1.8} className="nav-icon" />
              <span className="label-full">{item.label}</span>
              <span className="label-short">{item.short}</span>
            </NavLink>
          ))}
        </nav>

        {/* key={role}: a new list of notifications when the role changes */}
        <NotificationBell key={role} role={role} />

        <button className="logout" onClick={() => { logout(); navigate('/') }}>
          Log out
        </button>
      </header>

      <main className="app-content">
        {/* key: opens the page fresh when the address changes, e.g. from a notification */}
        <Outlet key={location.pathname + location.search} />
      </main>
    </div>
  )
}

export default AppLayout
