import { Navigate, Outlet } from 'react-router'
import { useUser } from '../api/userContext.js'

// Only shows the pages inside it to users with this role.
// Someone with another role is sent to their own home page (e.g. a tenant who types /manager).
// AppLayout already sends people who are not logged in to the login page.
function RequireRole({ role }) {
  const { user } = useUser()
  if (user && user.role !== role) {
    return <Navigate to={'/' + user.role} replace />
  }
  return <Outlet />
}

export default RequireRole
