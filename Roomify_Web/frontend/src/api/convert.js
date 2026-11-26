// The backend and the pages use different words for the same thing.
// These helpers translate between them, so the pages can stay as they were designed.
// (Date helpers are in utils/dates.js.)
import { photoUrl } from './client.js'
import { dayText } from '../utils/dates.js'

// Urgency: backend LOW / MEDIUM / HIGH  <->  pages Low / Medium / Urgent
const urgencyText = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'Urgent' }
export const urgencyCode = { Low: 'LOW', Medium: 'MEDIUM', Urgent: 'HIGH' }

// Ticket status as the tenant and manager pages show it
const reportStatus = { OPEN: 'waiting', ASSIGNED: 'inProgress', IN_PROGRESS: 'inProgress', RESOLVED: 'fixed' }

// Ticket status as the technician pages show it
const jobStatusText = { ASSIGNED: 'New', IN_PROGRESS: 'In progress', RESOLVED: 'Fixed' }
export const jobStatusCode = { 'In progress': 'IN_PROGRESS', Fixed: 'RESOLVED' }

// Role names: the backend says property_manager, the page addresses say manager
export function rolePage(role) {
  return role === 'property_manager' ? 'manager' : role
}

export function firstName(name) {
  return name ? name.split(' ')[0] : null
}

// A ticket from the backend, in the shape the tenant and manager pages use
export function toReport(ticket, myUserId) {
  return {
    id: ticket.ticket_id,
    title: ticket.title,
    category: ticket.category || 'Other',
    houseId: ticket.house_id,
    house: ticket.house_name,
    room: ticket.location || '',
    urgency: urgencyText[ticket.urgency],
    status: reportStatus[ticket.status],
    reportedBy: firstName(ticket.reported_by_name),
    posted: dayText(ticket.created_at),
    technicianId: ticket.technician_id,
    technician: firstName(ticket.technician_name),
    technicianFullName: ticket.technician_name,
    description: ticket.description || '',
    lastNote: ticket.last_note,
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
