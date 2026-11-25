import { useCallback, useEffect, useState } from 'react'
import { UserContext } from '../api/userContext.js'
import { SESSION_ENDED, hasToken } from '../api/client.js'
import { logout, whoAmI } from '../api/auth.js'

// Loads the logged-in user once (when the app opens) and shares it with every page.
function UserProvider({ children }) {
  // checking: true while we ask the backend who is logged in
  const [state, setState] = useState({ user: null, checking: hasToken(), error: '' })

  const loadUser = useCallback(async () => {
    if (!hasToken()) {
      setState({ user: null, checking: false, error: '' })
      return
    }
    setState((old) => ({ ...old, checking: true, error: '' }))
    try {
      const user = await whoAmI()
      setState({ user, checking: false, error: '' })
    } catch (err) {
      // 401: the token was not valid any more, so nobody is logged in.
      // Other errors (backend asleep, no internet): keep the token and show "Try again".
      setState({ user: null, checking: false, error: err.status === 401 ? '' : err.message })
    }
  }, [])

  useEffect(() => {
    // Ask the backend once, when the app opens (only if there is a saved token)
    if (hasToken()) {
      whoAmI().then(
        (user) => setState({ user, checking: false, error: '' }),
        (err) => setState({ user: null, checking: false, error: err.status === 401 ? '' : err.message }),
      )
    }
  }, [])

  // The backend said the token is not valid any more (see api/client.js): log out
  useEffect(() => {
    const endSession = () => setState({ user: null, checking: false, error: '' })
    window.addEventListener(SESSION_ENDED, endSession)
    return () => window.removeEventListener(SESSION_ENDED, endSession)
  }, [])

  const value = {
    user: state.user,
    checking: state.checking,
    error: state.error,
    // After login, register or a profile change: the new user data
    setUser: (user) => setState({ user, checking: false, error: '' }),
    reloadUser: loadUser,
    signOut: () => {
      logout()
      setState({ user: null, checking: false, error: '' })
    },
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export default UserProvider
