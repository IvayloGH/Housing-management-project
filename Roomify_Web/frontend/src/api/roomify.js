// All backend calls the pages use, grouped per part of the app.
// Each function gives back a Promise: use it with "await" or ".then(...)".
import { api } from './client.js'

// ---------- Profile ----------
export const updateProfile = (changes) => api('/users/me', { method: 'PUT', body: changes })
export const changePassword = (currentPassword, newPassword) =>
  api('/users/me/password', {
    method: 'PUT',
    body: { current_password: currentPassword, new_password: newPassword },
  })
export const getHousemates = () => api('/users/housemates')

// ---------- Face login ----------
export const getFaceStatus = () => api('/auth/face')
export const setupFace = (photo) =>
  api('/auth/face/setup', { method: 'POST', file: photo, fields: { consent: true } })
export const turnOffFace = () => api('/auth/face', { method: 'DELETE' })

// ---------- Chores ----------
export const getSchedule = (year, month) => api(`/chores/schedule?year=${year}&month=${month}`)
export const getMyChores = (limit = 3) => api('/chores/mine?limit=' + limit)
export const markChoreDone = (assignmentId) => api(`/chores/assignments/${assignmentId}/done`, { method: 'PUT' })
// chore: { title, tenant_id, first_date: '2026-11-30', repeat: 'ONCE' | 'WEEKLY' | 'MONTHLY' }
export const addChore = (chore) => api('/chores/assignments', { method: 'POST', body: chore })

// ---------- Groceries and expenses ----------
export const getGroceries = () => api('/groceries')
// status: 'low' (running low) | 'out' (none left)
export const addGrocery = (name, status) => api('/groceries', { method: 'POST', body: { name, status } })
export const setGroceryStatus = (itemId, status) =>
  api(`/groceries/${itemId}/status`, { method: 'PUT', body: { status } })
export const markBought = (itemId) => api(`/groceries/${itemId}/bought`, { method: 'PUT' })
export const deleteGrocery = (itemId) => api(`/groceries/${itemId}`, { method: 'DELETE' })
export const getExpenses = () => api('/expenses')
// Split between everyone in the house
export const addExpense = (description, amount) =>
  api('/expenses', { method: 'POST', body: { description, amount } })
// The person who owes presses PAY: their share is then paid back
export const settleShare = (expenseId, tenantId) =>
  api(`/expenses/${expenseId}/shares/${tenantId}/settle`, { method: 'PUT' })

// ---------- Maintenance tickets ----------
// ticket: { title, description, location, category, urgency: 'LOW' | 'MEDIUM' | 'HIGH' }
export const reportProblem = (ticket) => api('/tickets', { method: 'POST', body: ticket })
export const uploadPhoto = (ticketId, file) => api(`/tickets/${ticketId}/photos`, { method: 'POST', file })
export const getHouseTickets = () => api('/tickets/house')
export const getManagerTickets = () => api('/tickets/manager')
export const updateTicket = (ticketId, changes) => api(`/tickets/${ticketId}`, { method: 'PUT', body: changes })
export const assignTicket = (ticketId, technicianId) =>
  api(`/tickets/${ticketId}/assign`, { method: 'PUT', body: { technician_id: technicianId } })
export const declineTicket = (ticketId) => api(`/tickets/${ticketId}`, { method: 'DELETE' })
export const addNote = (ticketId, text) => api(`/tickets/${ticketId}/notes`, { method: 'POST', body: { text } })
export const getMyJobs = () => api('/tickets/assigned')
// status: 'IN_PROGRESS' or 'RESOLVED'
export const setJobStatus = (ticketId, status) =>
  api(`/tickets/${ticketId}/status`, { method: 'PUT', body: { status } })

// ---------- Houses and technicians (manager) ----------
export const getHouses = () => api('/houses')
// rooms: ['Kitchen', 'Bathroom 1', ...], the rooms tenants can choose from
export const addHouse = (street, city, rooms) => api('/houses', { method: 'POST', body: { street, city, rooms } })
export const editHouse = (houseId, street, city, rooms) =>
  api(`/houses/${houseId}`, { method: 'PUT', body: { street, city, rooms } })
export const getTeam = () => api('/houses/team')
export const getHouseTenants = (houseId) => api(`/houses/${houseId}/tenants`)
// Takes the tenant out of the house (their account and history stay)
export const removeTenant = (houseId, tenantId) =>
  api(`/houses/${houseId}/tenants/${tenantId}`, { method: 'DELETE' })

// ---------- Notifications ----------
export const getNotifications = () => api('/notifications')
export const markNotificationRead = (id) => api(`/notifications/${id}/read`, { method: 'PUT' })
