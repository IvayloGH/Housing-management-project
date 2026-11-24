// Fake data for all pages, until Ivaylo's backend is ready.
// The pages read from here. Later this data comes from the API instead.

export const tenantInfo = {
  name: 'You',
  house: 'Kerkstraat 12, Eindhoven',
  room: '06',
}

// ---------- Tenant: chores ----------
export const myChores = [
  { id: 1, day: 'Sun', date: 15, title: 'Clean the kitchen', text: 'Counters, stove and fridge shelf', done: false },
  { id: 2, day: 'Sun', date: 22, title: 'Clean the fridge', text: 'Throw out old food, wipe the shelves', done: false },
  { id: 3, day: 'Tue', date: 24, title: 'Take out the bins', text: 'Put them out the evening before', done: false },
]

// Everyone who lives in the tenant's house ("You" is the logged-in tenant)
export const housemates = ['You', 'Mateo', 'Violeta', 'Kalina', 'Andor', 'Ines']

// Chores of the whole house in November 2026 (day of the month → chores)
// status: 'done' | 'notDone' | 'planned'
export const houseSchedule = {
  1: [{ task: 'Kitchen', who: 'Mateo', status: 'done' }, { task: 'Fridge', who: 'Violeta', status: 'notDone' }],
  3: [{ task: 'Bins', who: 'Violeta', status: 'done' }],
  6: [{ task: 'Bathroom 1', who: 'Andor', status: 'done' }, { task: 'Bathroom 2', who: 'Ines', status: 'done' }],
  7: [{ task: 'Hallway', who: 'You', status: 'done' }],
  8: [{ task: 'Kitchen', who: 'Kalina', status: 'done' }, { task: 'Fridge', who: 'Mateo', status: 'notDone' }],
  10: [{ task: 'Bins', who: 'Mateo', status: 'done' }],
  13: [{ task: 'Bathroom 1', who: 'Violeta', status: 'done' }, { task: 'Bathroom 2', who: 'Andor', status: 'done' }],
  14: [{ task: 'Hallway', who: 'Ines', status: 'done' }],
  15: [{ task: 'Kitchen', who: 'You', status: 'planned' }, { task: 'Fridge', who: 'Kalina', status: 'planned' }],
  17: [{ task: 'Bins', who: 'Kalina', status: 'planned' }],
  20: [{ task: 'Bathroom 1', who: 'Mateo', status: 'planned' }, { task: 'Bathroom 2', who: 'Violeta', status: 'planned' }],
  21: [{ task: 'Hallway', who: 'Andor', status: 'planned' }],
  22: [{ task: 'Kitchen', who: 'Ines', status: 'planned' }, { task: 'Fridge', who: 'You', status: 'planned' }],
  24: [{ task: 'Bins', who: 'You', status: 'planned' }],
  27: [{ task: 'Bathroom 1', who: 'Kalina', status: 'planned' }, { task: 'Bathroom 2', who: 'Mateo', status: 'planned' }],
  28: [{ task: 'Hallway', who: 'Violeta', status: 'planned' }],
  29: [{ task: 'Kitchen', who: 'Andor', status: 'planned' }, { task: 'Fridge', who: 'Ines', status: 'planned' }],
}

// ---------- Tenant: shared groceries ----------
export const supplies = [
  { id: 1, name: 'Dish soap', addedBy: 'Violeta', status: 'low' },
  { id: 2, name: 'Sponges', addedBy: 'Andor', status: 'out' },
  { id: 3, name: 'Toilet paper', addedBy: 'Kalina', status: 'enough' },
  { id: 4, name: 'Bin bags', addedBy: 'you', status: 'low' },
  { id: 5, name: 'Milk', addedBy: 'Ines', status: 'out' },
]

export const youOwe = [
  { id: 1, person: 'Mateo', amount: 8.4, reason: 'cleaning supplies' },
  { id: 2, person: 'Violeta', amount: 1.2, reason: 'bin bags' },
]

export const owedToYou = [
  { id: 1, person: 'Kalina', amount: 5.1, reason: 'dish soap and sponges' },
  { id: 2, person: 'Andor', amount: 2.35, reason: 'toilet paper' },
]

// ---------- Maintenance reports (used by tenant, manager and technician) ----------
// status: 'waiting' | 'inProgress' | 'fixed'
export const reports = [
  {
    id: 1, title: 'Shower drain leaking', category: 'Plumbing', house: 'Kerkstraat 12', room: 'Bathroom 2',
    urgency: 'Urgent', status: 'waiting', reportedBy: 'Andrea', posted: 'Today', technician: null,
    description: 'Water keeps leaking under the shower drain onto the floor.', mine: true,
  },
  {
    id: 2, title: 'No power in kitchen sockets', category: 'Electrical', house: 'Stratumseind 40', room: 'Kitchen',
    urgency: 'Urgent', status: 'waiting', reportedBy: 'Violeta', posted: 'Today', technician: null,
    description: 'None of the sockets next to the stove work since this morning.',
  },
  {
    id: 3, title: 'Door closer adjustment', category: 'Small repairs', house: 'Kerkstraat 12', room: 'Entrance',
    urgency: 'Low', status: 'inProgress', reportedBy: 'Andor', posted: 'Today', technician: 'Marco',
    description: 'The front door slams shut very hard.',
  },
  {
    id: 4, title: 'Mould on bathroom ceiling', category: 'Cleaning', house: 'Kerkstraat 12', room: 'Bathroom 1',
    urgency: 'Medium', status: 'waiting', reportedBy: 'Andor', posted: 'Yesterday', technician: null,
    description: 'Black spots are growing in the corner above the shower.',
  },
  {
    id: 5, title: 'Hallway light flickers', category: 'Electrical', house: 'Kerkstraat 12', room: 'Hallway, 2nd floor',
    urgency: 'Medium', status: 'inProgress', reportedBy: 'Andrea', posted: 'Sat 14 Nov', technician: 'Elena',
    description: 'The light on the second floor keeps flickering at night.', mine: true,
  },
  {
    id: 6, title: 'Broken chair', category: 'Small repairs', house: 'Kerkstraat 12', room: 'Living room',
    urgency: 'Low', status: 'fixed', reportedBy: 'Andrea', posted: 'Thu 12 Nov', technician: 'Marco',
    description: 'One leg of a dining chair is loose.', mine: true,
  },
]

// ---------- Manager: houses and technicians ----------
// roomTypes: which kinds of rooms a house has, and how many of each
export const houses = [
  {
    id: 1, street: 'Kerkstraat 12', city: 'Eindhoven', tenants: 6,
    roomTypes: { Bedroom: 6, Kitchen: 1, Bathroom: 2, 'Living room': 1, Hallway: 1 },
  },
  {
    id: 2, street: 'Stratumseind 40', city: 'Eindhoven', tenants: 11,
    roomTypes: { Bedroom: 12, Kitchen: 2, Bathroom: 4, Toilet: 2, 'Living room': 1, Hallway: 2, 'Laundry room': 1 },
  },
]

// Room types the manager can pick from when adding a house
export const standardRoomTypes = [
  'Bedroom', 'Kitchen', 'Bathroom', 'Toilet', 'Living room', 'Hallway', 'Laundry room', 'Storage',
]

export const technicians = [
  { id: 1, name: 'Marco Rossi', skills: 'Plumbing, small repairs' },
  { id: 2, name: 'Lukas Novak', skills: 'Plumbing, heating' },
  { id: 3, name: 'Elena Popescu', skills: 'Electrical' },
  { id: 4, name: 'Nadia Haddad', skills: 'Cleaning' },
  { id: 5, name: 'Sofia Marin', skills: 'Electrical, small repairs' },
]

// ---------- Technician: jobs and work history ----------
export const technicianInfo = { name: 'Marco', fullName: 'Marco Rossi' }

export const jobs = [
  {
    id: 1, title: 'Leaking radiator valve', place: 'Stratumseind 40 · Room 2.03', reported: '3 days ago',
    urgency: 'Urgent', when: 'Today, morning', status: 'In progress',
    description: 'The radiator valve drips onto the wooden floor.',
  },
  {
    id: 2, title: 'Broken window latch', place: 'Stratumseind 40 · Room 1.12', reported: 'yesterday',
    urgency: 'Medium', when: 'Today, afternoon', status: 'Accepted',
    description: 'The window does not close anymore, the latch is broken.',
  },
  {
    id: 3, title: 'Replace kitchen tap', place: 'Stratumseind 40 · Kitchen', reported: '4 days ago',
    urgency: 'Medium', when: 'Thursday 19 Nov', status: 'Accepted',
    description: 'The kitchen tap is loose and leaks at the bottom.',
  },
  {
    id: 4, title: 'Door closer adjustment', place: 'Kerkstraat 12 · Entrance', reported: 'today',
    urgency: 'Low', when: 'Not planned yet', status: 'New',
    description: 'The front door slams shut very hard.',
  },
]

export const workHistory = [
  { id: 1, date: 'Sun 15 Nov', title: 'Blocked kitchen sink', place: 'Stratumseind 40 · Kitchen', text: 'Cleared the drain and cleaned the trap.', fixed: true },
  { id: 2, date: 'Fri 13 Nov', title: 'Washing machine leaking', place: 'Kerkstraat 12 · Laundry room', text: 'Hose is cracked, new part is ordered.', fixed: false },
  { id: 3, date: 'Thu 12 Nov', title: 'Broken chair', place: 'Kerkstraat 12 · Living room', text: 'Tightened the legs and replaced one screw.', fixed: true },
]

// ---------- Functions that change the fake data ----------
// Pages call these, so a change on one page (for example a new report)
// is also visible on another page (for example the manager overview).

// Adds a new report at the top of the list
export function addReport(report) {
  reports.unshift(report)
}

// The manager sends a technician to a report
export function assignReport(id, technician, urgency, category) {
  const report = reports.find((r) => r.id === id)
  report.technician = technician
  report.urgency = urgency
  report.category = category
  report.status = 'inProgress'
}

// The manager declines a report: it is taken out of the list
export function removeReport(id) {
  const index = reports.findIndex((r) => r.id === id)
  reports.splice(index, 1) // splice(index, 1) removes 1 item at that place
}

// The technician changes when a job is planned and its status
export function updateJob(id, when, status) {
  const job = jobs.find((j) => j.id === id)
  job.when = when
  job.status = status
}

// ---------- Notifications ----------
// Ivaylo's backend has no notifications yet. Suggested fields for the API:
// id, role (or user), text, time, read (true/false), link (page to open)
export const notifications = [
  { id: 1, role: 'tenant', text: 'Elena started fixing the hallway light.', time: '10 min ago', read: false, link: '/tenant' },
  { id: 2, role: 'tenant', text: "It's your turn: clean the kitchen on Sunday.", time: '1 hour ago', read: false, link: '/tenant/schedule' },
  { id: 3, role: 'tenant', text: 'Ines added Milk to the shopping list.', time: 'Yesterday', read: false, link: '/tenant/groceries' },
  { id: 4, role: 'tenant', text: 'Marco fixed the broken chair.', time: 'Thu 12 Nov', read: true, link: '/tenant/report' },

  { id: 5, role: 'manager', text: 'New urgent report: No power in kitchen sockets at Stratumseind 40.', time: '12 min ago', read: false, link: '/manager/review?report=2' },
  { id: 6, role: 'manager', text: 'New report: Mould on bathroom ceiling at Kerkstraat 12.', time: 'Yesterday', read: false, link: '/manager/review?report=4' },
  { id: 7, role: 'manager', text: 'Marco accepted Door closer adjustment.', time: 'Yesterday', read: true, link: '/manager' },
  { id: 8, role: 'manager', text: 'Elena started Hallway light flickers.', time: 'Sat 14 Nov', read: true, link: '/manager' },

  { id: 9, role: 'technician', text: 'New job: Door closer adjustment at Kerkstraat 12.', time: '5 min ago', read: false, link: '/technician' },
  { id: 10, role: 'technician', text: 'Leaking radiator valve is planned for today, morning.', time: 'Today', read: false, link: '/technician' },
  { id: 11, role: 'technician', text: 'The manager set Replace kitchen tap to Medium.', time: 'Yesterday', read: true, link: '/technician' },
]

// Marks one notification as read
export function markNotificationRead(id) {
  const notification = notifications.find((n) => n.id === id)
  notification.read = true
}
