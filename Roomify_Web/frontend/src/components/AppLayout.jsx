import { NavLink, Navigate, Outlet, useLocation } from 'react-router'
import Logo from './Logo.jsx'
import NotificationBell from './NotificationBell.jsx'
import Icon from './Icon.jsx'
import { useUser } from '../api/userContext.js'

// Menu items per role, from the Figma design.
// The role comes from the logged-in user (api/userContext.js).
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
  const { user, checking, error, reloadUser, signOut } = useUser()

  // Still asking the backend who is logged in
  if (checking) {
    return <p className="row-sub page-message">Loading…</p>
  }

  // The backend could not be reached (e.g. the database is waking up)
  if (error) {
    return (
      <div className="page-message">
        <p className="error">{error}</p>
        <div className="button-row">
          <button className="btn" onClick={reloadUser}>Try again</button>
          <button className="link-button" onClick={signOut}>Log out</button>
        </div>
      </div>
    )
  }

  // Nobody is logged in (or the session ended): go to the login page
  if (!user) {
    return <Navigate to="/" replace />
  }

  const menu = menus[user.role] || []

  return (
    <div className="app-layout">
      <header className="app-header">
        <Logo to={'/' + user.role} />

        <nav className="app-nav">
          {menu.map((item) => (
            <NavLink key={item.to} to={item.to} end>
              <Icon name={item.icon} size={22} strokeWidth={1.8} className="nav-icon" />
              <span className="label-full">{item.label}</span>
              <span className="label-short">{item.short}</span>
            </NavLink>
          ))}
        </nav>

        <NotificationBell role={user.role} />

        <button className="logout" onClick={signOut}>
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
