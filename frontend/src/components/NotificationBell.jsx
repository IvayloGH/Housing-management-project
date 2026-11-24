import { useState } from 'react'
import { useNavigate } from 'react-router'
import { notifications, markNotificationRead } from '../data/mockData.js'

// The bell in the top bar. The red number shows how many notifications are unread.
// Click the bell to open the list, click a notification to go to its page.
function NotificationBell({ role }) {
  // Only the notifications for this role (tenant, manager or technician)
  const [items, setItems] = useState(notifications.filter((n) => n.role === role))
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const unreadCount = items.filter((n) => !n.read).length

  function openNotification(notification) {
    // Mark it as read in the fake data and in this list
    markNotificationRead(notification.id)
    setItems(items.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
    setOpen(false)
    navigate(notification.link)
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
                <li key={n.id}>
                  <button
                    className={n.read ? 'notification' : 'notification unread'}
                    onClick={() => openNotification(n)}
                  >
                    {!n.read && <span className="dot dot-green" />}
                    <span>
                      <span className="notification-text">{n.text}</span>
                      <span className="row-sub">{n.time}</span>
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
