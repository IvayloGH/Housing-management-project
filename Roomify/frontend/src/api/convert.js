// The backend and the pages use different words for the same thing.
// These helpers translate between them, so the pages can stay as they were designed.
import { photoUrl } from './client.js'

// Urgency: backend LOW / MEDIUM / HIGH  <->  pages Low / Medium / Urgent
export const urgencyText = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'Urgent' }
export const urgencyCode = { Low: 'LOW', Medium: 'MEDIUM', Urgent: 'HIGH' }

// Ticket status as the tenant and manager pages show it
const reportStatus = { OPEN: 'waiting', ASSIGNED: 'inProgress', IN_PROGRESS: 'inProgress', RESOLVED: 'fixed' }

// Ticket status as the technician pages show it
export const jobStatusText = { ASSIGNED: 'New', IN_PROGRESS: 'In progress', RESOLVED: 'Fixed' }
export const jobStatusCode = { 'In progress': 'IN_PROGRESS', Fixed: 'RESOLVED' }

// Role names: the backend says property_manager, the page addresses say manager
export function rolePage(role) {
  return role === 'property_manager' ? 'manager' : role
}

export function firstName(name) {
  return name ? name.split(' ')[0] : null
}

// The backend sends times in UTC without a "Z" at the end. Add it, so the browser
// shows the time in your own time zone.
function toDate(text) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(text) ? text : text + 'Z')
}

// A date without a time from the backend ("2026-11-30"), as a Date in your own time zone
export function fromDateText(text) {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// "Today", "Yesterday" or a short date like "Sat 14 Nov"
export function dayText(text) {
  const date = toDate(text)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// A ticket from the backend, in the shape the tenant and manager pages use
export function toReport(ticket, myUserId) {
  return {
    id: ticket.ticket_id,
    title: ticket.title,
    category: ticket.category || 'Other',
    house: ticket.house_name,
    room: ticket.location || '',
    urgency: urgencyText[ticket.urgency],
    status: reportStatus[ticket.status],
    reportedBy: firstName(ticket.reported_by_name),
    posted: dayText(ticket.created_at),
    technician: firstName(ticket.technician_name),
    description: ticket.description || '',
    photo: photoUrl(ticket.photo_urls[0]),
    mine: ticket.reported_by === myUserId,
  }
}

// A ticket from the backend, in the shape the technician pages use
export function toJob(ticket) {
  return {
    id: ticket.ticket_id,
    title: ticket.title,
    place: ticket.house_name + (ticket.location ? ' · ' + ticket.location : ''),
    reported: dayText(ticket.created_at).toLowerCase(),
    urgency: urgencyText[ticket.urgency],
    status: jobStatusText[ticket.status],
    description: ticket.description || '',
    note: ticket.last_note,
    photo: photoUrl(ticket.photo_urls[0]),
  }
}
