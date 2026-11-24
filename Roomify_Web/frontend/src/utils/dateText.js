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
