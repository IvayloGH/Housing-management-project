import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import { tenantInfo, houseSchedule, housemates } from '../data/mockData.js'
import { dateText, todayText } from '../utils/dateText.js'

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const commonChores = ['Kitchen', 'Fridge', 'Bins', 'Bathroom 1', 'Bathroom 2', 'Hallway', 'Living room']
const repeatOptions = ['Once', 'Every week', 'Every 2 weeks']
const statusLabel = { done: 'Done', notDone: 'Not done', planned: 'Planned' }

// The fake chores are stored per day of November 2026 (1, 3, 6, ...).
// Here we give every day its full date as name, like "2026-11-15".
function makeStartSchedule() {
  const schedule = {}
  for (const day in houseSchedule) {
    schedule[dateText(2026, 11, Number(day))] = houseSchedule[day]
  }
  return schedule
}

function TenantSchedulePage() {
  // The month we look at. month: 1 = January ... 12 = December
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(11)
  // The day that is selected in the calendar (its chores are listed under it)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  // All chores, per day: { "2026-11-15": [ {task, who, status}, ... ] }
  const [schedule, setSchedule] = useState(makeStartSchedule())
  const [message, setMessage] = useState('')

  // The "Add a chore" form
  const [formOpen, setFormOpen] = useState(false)
  const [task, setTask] = useState('')
  const [who, setWho] = useState('You')
  const [choreDate, setChoreDate] = useState('')
  const [repeat, setRepeat] = useState('Once')
  const [formError, setFormError] = useState('')

  const monthName = monthNames[month - 1]
  const today = todayText()
  const selected = dateText(year, month, selectedDay)
  const choresOfSelectedDay = schedule[selected] || []

  // ---------- Building the month grid ----------
  // How many days this month has. (Day 0 of the next month is the last day of this month.)
  const daysInMonth = new Date(year, month, 0).getDate()
  // Which weekday the 1st is. getDay() gives 0 = Sunday, 1 = Monday ... 6 = Saturday.
  // Our week starts on Monday, so we need that many empty boxes before the 1st.
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const emptyBoxes = firstWeekday === 0 ? 6 : firstWeekday - 1

  const emptyList = []
  for (let i = 0; i < emptyBoxes; i++) {
    emptyList.push(i)
  }
  const dayList = []
  for (let day = 1; day <= daysInMonth; day++) {
    dayList.push(day)
  }

  // ---------- Functions ----------
  function changeMonth(step) {
    let newMonth = month + step
    let newYear = year
    if (newMonth === 0) {
      newMonth = 12
      newYear = year - 1
    }
    if (newMonth === 13) {
      newMonth = 1
      newYear = year + 1
    }
    setMonth(newMonth)
    setYear(newYear)
    setSelectedDay(1)
  }

  function openForm() {
    setTask('')
    setWho('You')
    setChoreDate(selected)
    setRepeat('Once')
    setFormError('')
    setMessage('')
    setFormOpen(true)
  }

  function addChore(event) {
    event.preventDefault()
    if (task.trim() === '') {
      setFormError('Pick or type a chore.')
      return
    }

    // The date input gives text like "2026-11-15". Split it into numbers.
    const parts = choreDate.split('-')
    const choreYear = Number(parts[0])
    const choreMonth = Number(parts[1])
    const firstDay = Number(parts[2])
    const lastDay = new Date(choreYear, choreMonth, 0).getDate()

    // Which days get the chore: only the first day, or every 7 or 14 days until the end of the month
    const days = [firstDay]
    let step = 0
    if (repeat === 'Every week') step = 7
    if (repeat === 'Every 2 weeks') step = 14
    if (step > 0) {
      for (let day = firstDay + step; day <= lastDay; day = day + step) {
        days.push(day)
      }
    }

    // Add the chore to each of those days
    const newSchedule = { ...schedule }
    for (const day of days) {
      const name = dateText(choreYear, choreMonth, day)
      const choresThatDay = newSchedule[name] || []
      newSchedule[name] = [...choresThatDay, { task: task.trim(), who: who, status: 'planned' }]
    }
    setSchedule(newSchedule)

    // Show the month and day of the new chore
    setYear(choreYear)
    setMonth(choreMonth)
    setSelectedDay(firstDay)
    setFormOpen(false)

    if (days.length > 1) {
      setMessage(`${task.trim()} · ${who} added (${days.length} times this month)`)
    } else {
      setMessage(`${task.trim()} · ${who} added`)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · Cleaning schedule · ${tenantInfo.house}`}
        title="Cleaning schedule."
        titleMuted="Everyone's chores for the month."
      />

      <div className="page-body">
        {message && <p className="saved message"><Icon name="check" /> {message}</p>}

        {/* ---------- Add a chore ---------- */}
        {formOpen && (
          <form className="card add-chore" onSubmit={addChore}>
            <div className="card-head">
              <h2>Add a chore</h2>
              <button type="button" className="link-button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>

            <div className="field">
              <label htmlFor="task">What needs to be done?</label>
              <ChipGroup options={commonChores} value={task} onChange={setTask} size="chips-small" />
              {/* The text box stays empty when a chip above is chosen */}
              <input
                id="task"
                placeholder="Or type your own, e.g. Clean the oven"
                value={commonChores.includes(task) ? '' : task}
                onChange={(e) => setTask(e.target.value)}
              />
            </div>

            <div className="form-grid even chore-grid">
              <div className="field">
                <label htmlFor="who">Who does it?</label>
                <select id="who" value={who} onChange={(e) => setWho(e.target.value)}>
                  {housemates.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="day">Which day?</label>
                <input id="day" type="date" value={choreDate} onChange={(e) => setChoreDate(e.target.value)} required />
              </div>
            </div>

            <div className="field">
              <label>How often?</label>
              <ChipGroup options={repeatOptions} value={repeat} onChange={setRepeat} />
            </div>

            {formError && <p className="error">{formError}</p>}

            <div>
              <button type="submit" className="btn">Add chore</button>
            </div>
          </form>
        )}

        {/* ---------- The calendar ---------- */}
        <section className="calendar-mobile">
          <div className="mcal-top">
            <h2 className="mcal-month">
              {monthName} <span>{year}</span>
            </h2>
            <div className="mcal-nav">
              <button onClick={() => changeMonth(-1)} aria-label="Previous month">
                <Icon name="chevronLeft" size={20} />
              </button>
              <button onClick={() => changeMonth(1)} aria-label="Next month">
                <Icon name="chevronRight" size={20} />
              </button>
            </div>
          </div>

          <div className="mcal-grid">
            {weekDays.map((d) => (
              <span key={d} className="mcal-weekday">{d[0]}</span>
            ))}

            {/* Empty boxes before the 1st, so the 1st is under the right weekday */}
            {emptyList.map((i) => (
              <span key={'empty' + i} />
            ))}

            {dayList.map((day) => {
              const name = dateText(year, month, day)
              const chores = schedule[name] || []

              let className = 'mcal-day'
              if (name === selected) className += ' selected'
              if (name === today) className += ' today'

              return (
                <button
                  key={name}
                  className={className}
                  onClick={() => setSelectedDay(day)}
                  aria-label={`${day} ${monthName}, ${chores.length} chores`}
                >
                  <span className="mcal-number">{day}</span>
                  {/* Show the first 2 chores in the day, and "+1" etc. for the rest */}
                  {chores.slice(0, 2).map((c, i) => (
                    <span key={i} className={'mcal-chip mcal-' + c.status + (c.who === 'You' ? ' mine' : '')}>
                      {c.task}
                    </span>
                  ))}
                  {chores.length > 2 && <span className="mcal-more">+{chores.length - 2}</span>}
                </button>
              )
            })}
          </div>

          {/* ---------- The chores of the selected day ---------- */}
          <div className="mcal-list">
            <div className="mcal-list-head">
              <h3>
                {new Date(year, month - 1, selectedDay).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button className="mcal-add" onClick={openForm} aria-label="Add a chore on this day">
                <Icon name="plus" size={20} />
              </button>
            </div>

            {choresOfSelectedDay.length === 0 ? (
              <p className="mcal-empty">No chores on this day.</p>
            ) : (
              <ul>
                {choresOfSelectedDay.map((chore, i) => (
                  <li key={i} className={'mcal-event mcal-' + chore.status + (chore.who === 'You' ? ' mine' : '')}>
                    <div>
                      <strong>{chore.task}</strong>
                      <span>{chore.who}</span>
                    </div>
                    <span className="mcal-status">{statusLabel[chore.status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

export default TenantSchedulePage
