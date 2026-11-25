import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useApi } from '../api/useApi.js'
import { getNotifications, markNotificationRead } from '../api/roomify.js'
import { dayText } from '../api/convert.js'

// Where a notification takes you, per role
const homePage = { tenant: '/tenant/report', manager: '/manager', technician: '/technician' }

// The bell in the top bar. The red number shows how many notifications are unread.
// Click the bell to open the list, click a notification to go to its page.
function NotificationBell({ role }) {
  const { data, reload } = useApi(getNotifications)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const items = data || []
  const unreadCount = items.filter((n) => !n.is_read).length

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
      <button className="bell" onClick={() => setOpen(!open)} aria-label="Notifications">
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
