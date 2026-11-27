import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useApi } from '../api/useApi.js'
import { getNotifications, markNotificationRead } from '../api/roomify.js'
import { dayText } from '../utils/dates.js'

// Where a notification takes you, per role
const homePage = { tenant: '/tenant/report', manager: '/manager', technician: '/technician' }

// Look for new notifications this often (1 minute)
const REFRESH_EVERY = 60 * 1000

// The bell in the top bar. The red number shows how many notifications are unread.
// Click the bell to open the list, click a notification to go to its page.
function NotificationBell({ role }) {
  const { data, reload } = useApi(getNotifications)
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const navigate = useNavigate()

  const items = data || []
  const unreadCount = items.filter((n) => !n.is_read).length

  // New notifications appear without refreshing the page
  useEffect(() => {
    const timer = setInterval(reload, REFRESH_EVERY)
    return () => clearInterval(timer)
  }, [reload])

  // Escape closes the list
  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function toggle() {
    if (!open) reload() // show the newest list when it opens
    setOpen(!open)
  }

  // Mark every unread notification in the list as read
  async function markAllRead() {
    setMarkingAll(true)
    const unread = items.filter((n) => !n.is_read)
    await Promise.all(unread.map((n) => markNotificationRead(n.notification_id).catch(() => null)))
    reload()
    setMarkingAll(false)
  }

  async function openNotification(notification) {
    setOpen(false)
    if (!notification.is_read) {
      await markNotificationRead(notification.notification_id).catch(() => null)
      reload()
    }
    navigate(homePage[role] || '/')
  }

  return (
    <div className="notifications">
      <button className="bell" onClick={toggle} aria-label="Notifications" aria-expanded={open}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z" strokeLinejoin="round" />
          <path d="M10 20.5a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {open && (
        <>
          {/* An invisible layer over the whole page: clicking next to the list closes it */}
          <div className="notification-backdrop" onClick={() => setOpen(false)} />

          <div className="notification-panel">
            <div className="notification-head">
              <strong>Notifications</strong>
              {unreadCount > 0 && (
                <button className="link-button" onClick={markAllRead} disabled={markingAll}>
                  {markingAll ? 'Marking…' : 'Mark all as read'}
                </button>
              )}
            </div>

            {items.length === 0 && <p className="notification-empty">You have no notifications.</p>}

            <ul>
              {items.map((n) => (
                <li key={n.notification_id}>
                  <button
                    className={n.is_read ? 'notification' : 'notification unread'}
                    onClick={() => openNotification(n)}
                  >
                    {!n.is_read && <span className="dot dot-green" />}
                    <span>
                      <span className="notification-text">{n.message}</span>
                      <span className="row-sub">{dayText(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
