import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import Logo from './Logo.jsx'

// Menu items per role, from the Figma design.
// For now the role comes from the URL (/tenant, /manager, /technician).
// In step 2 it will come from the logged-in user instead.
const menus = {
  tenant: [
    { to: '/tenant', label: 'Home' },
    { to: '/tenant/schedule', label: 'Cleaning schedule' },
    { to: '/tenant/groceries', label: 'Shared groceries' },
    { to: '/tenant/report', label: 'Report a problem' },
    { to: '/tenant/profile', label: 'My profile' },
  ],
  manager: [
    { to: '/manager', label: 'Overview' },
    { to: '/manager/review', label: 'Review & assign' },
    { to: '/manager/houses', label: 'Houses & team' },
    { to: '/manager/profile', label: 'My profile' },
  ],
  technician: [
    { to: '/technician', label: 'My jobs' },
    { to: '/technician/done', label: 'Work done' },
    { to: '/technician/profile', label: 'My profile' },
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
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="logout" onClick={() => navigate('/')}>
          Log out
        </button>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
