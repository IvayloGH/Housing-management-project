import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import { PersonalDetailsCard, SignInCard, LogoutCard } from '../components/ProfileCards.jsx'
import { technicianInfo } from '../data/mockData.js'

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '20:00', '22:00']

function TechnicianProfilePage() {
  // Specialties: all options, and the ones that are chosen
  const [skillOptions, setSkillOptions] = useState([
    'Plumbing', 'Heating', 'Electrical', 'Cleaning', 'Small repairs',
    'Carpentry', 'Locks & doors', 'Appliances', 'Painting',
  ])
  const [skills, setSkills] = useState(['Plumbing', 'Small repairs'])
  const [newSkill, setNewSkill] = useState('')

  // When and where you work
  const [days, setDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [from, setFrom] = useState('08:00')
  const [until, setUntil] = useState('17:00')
  const [cityOptions, setCityOptions] = useState(['Eindhoven', 'Veldhoven', 'Best', 'Helmond', 'Geldrop'])
  const [cities, setCities] = useState(['Eindhoven', 'Veldhoven'])
  const [newCity, setNewCity] = useState('')
  const [saved, setSaved] = useState(false)

  // Adds your own specialty and chooses it straight away
  function addSkill(event) {
    event.preventDefault()
    const skill = newSkill.trim()
    if (skill === '') return
    if (!skillOptions.includes(skill)) setSkillOptions([...skillOptions, skill])
    if (!skills.includes(skill)) setSkills([...skills, skill])
    setNewSkill('')
  }

  // Adds your own city and chooses it straight away
  function addCity(event) {
    event.preventDefault()
    const city = newCity.trim()
    if (city === '') return
    if (!cityOptions.includes(city)) setCityOptions([...cityOptions, city])
    if (!cities.includes(city)) setCities([...cities, city])
    setNewCity('')
    setSaved(false)
  }

  return (
    <>
      <PageHeader
        eyebrow={`Technician · ${technicianInfo.fullName} · My profile`}
        title="What you're good at."
      />

      <div className="page-body stack">
        <section className="card">
          <h2>Your specialties</h2>
          <p className="card-text-small">Pick everything you can fix. You only get jobs that match.</p>
          <ChipGroup options={skillOptions} value={skills} onChange={setSkills} multiple />
          <form className="add-row tight" onSubmit={addSkill}>
            <input
              placeholder="Something else? Type it here"
              aria-label="Add a specialty"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
            />
            <button type="submit" className="btn btn-small">Add</button>
          </form>
        </section>

        <section className="card">
          <h2>When and where you work</h2>

          <div className="field">
            <label>Days you are available</label>
            <ChipGroup
              options={weekDays}
              value={days}
              onChange={(newDays) => { setDays(newDays); setSaved(false) }}
              multiple
              size="chips-days"
            />
          </div>

          <div className="form-grid even narrow">
            <div className="field">
              <label htmlFor="from">From</label>
              <select id="from" value={from} onChange={(e) => { setFrom(e.target.value); setSaved(false) }}>
                {hours.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="until">Until</label>
              <select id="until" value={until} onChange={(e) => { setUntil(e.target.value); setSaved(false) }}>
                {hours.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Cities you work in</label>
            <ChipGroup
              options={cityOptions}
              value={cities}
              onChange={(newCities) => { setCities(newCities); setSaved(false) }}
              multiple
            />
          </div>
          <form className="add-row tight" onSubmit={addCity}>
            <input
              placeholder="Add a place, e.g. Son en Breugel"
              aria-label="Add a city"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
            />
            <button type="submit" className="btn btn-small">Add place</button>
          </form>

          <div className="card-footer">
            <button type="button" className="btn" onClick={() => setSaved(true)}>Save profile</button>
            {saved && <span className="saved"><Icon name="check" /> Saved</span>}
          </div>
        </section>

        <PersonalDetailsCard title="Account" />
        <SignInCard />
        <LogoutCard />
      </div>
    </>
  )
}

export default TechnicianProfilePage
