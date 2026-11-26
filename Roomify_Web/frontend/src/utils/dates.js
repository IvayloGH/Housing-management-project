// Everything about dates in one place.

// Turns a date into text like "2026-11-15" (year-month-day).
// This is the format a date input uses, and we use it to look up chores per day.
// month: 1 = January ... 12 = December
export function dateText(year, month, day) {
  const twoDigitMonth = month < 10 ? '0' + month : month
  const twoDigitDay = day < 10 ? '0' + day : day
  return year + '-' + twoDigitMonth + '-' + twoDigitDay
}

// Today as text, e.g. "2026-11-24"
export function todayText() {
  const now = new Date()
  // getMonth() counts from 0 (January = 0), so we add 1
  return dateText(now.getFullYear(), now.getMonth() + 1, now.getDate())
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

// A long date like "Wednesday 25 November"
export function longDayText(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
