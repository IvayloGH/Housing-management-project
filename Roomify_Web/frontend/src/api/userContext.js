import { createContext, useContext } from 'react'

// Who is logged in, shared by every page (filled by components/UserProvider.jsx).
//   const { user } = useUser()
// user: null = nobody is logged in, otherwise the profile from GET /users/me:
//   { user_id, name, email, role: 'tenant' | 'manager' | 'technician',
//     house_id, house_name, room_number (tenants), specialty (technicians) }
export const UserContext = createContext(null)

export function useUser() {
  return useContext(UserContext)
}
