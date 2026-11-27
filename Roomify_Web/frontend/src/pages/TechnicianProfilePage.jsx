import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import Icon from '../components/Icon.jsx'
import { PersonalDetailsCard, SignInCard, LogoutCard } from '../components/ProfileCards.jsx'
import { useUser } from '../api/userContext.js'
import { updateProfile } from '../api/roomify.js'
import { rolePage } from '../api/convert.js'

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '20:00', '22:00']

const standardCities = ['Eindhoven', 'Veldhoven', 'Best', 'Helmond', 'Geldrop']

const standardSkills = [
  'Plumbing', 'Heating', 'Electrical', 'Cleaning', 'Small repairs',
  'Carpentry', 'Locks & doors', 'Appliances', 'Painting',
]

// The backend keeps the specialties as one text of max. 100 letters: "Plumbing, Small repairs"
const MAX_SPECIALTY_LENGTH = 100

function TechnicianProfilePage() {
  const { user: profile, setUser } = useUser()
  const mySkills = profile.specialty ? profile.specialty.split(',').map((s) => s.trim()).filter(Boolean) : []
  // Specialties: all options, and the ones that are chosen
  const [skillOptions, setSkillOptions] = useState([...standardSkills, ...mySkills.filter((s) => !standardSkills.includes(s))])
  const [skills, setSkills] = useState(mySkills)
  const [newSkill, setNewSkill] = useState('')
  const [skillsSaved, setSkillsSaved] = useState(false)
  const [skillsError, setSkillsError] = useState('')
  const [savingSkills, setSavingSkills] = useState(false)
  const specialtyText = skills.join(', ')
  const tooLong = specialtyText.length > MAX_SPECIALTY_LENGTH

  async function saveSkills() {
    setSkillsError('')
    setSavingSkills(true)
    try {
      const updated = await updateProfile({ specialty: specialtyText })
      setUser({ ...updated, role: rolePage(updated.role) })
      setSkillsSaved(true)
    } catch (err) {
      setSkillsError(err.message)
    }
    setSavingSkills(false)
  }

  // When and where you work (nothing saved yet: start with Mon-Fri, 08:00-17:00)
  const nothingSaved = !profile.work_days?.length && !profile.work_from && !profile.work_cities?.length
  const myCities = profile.work_cities || []
  const [days, setDays] = useState(nothingSaved ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : profile.work_days || [])
  const [from, setFrom] = useState(profile.work_from || '08:00')
  const [until, setUntil] = useState(profile.work_until || '17:00')
  const [cityOptions, setCityOptions] = useState([...standardCities, ...myCities.filter((c) => !standardCities.includes(c))])
  const [cities, setCities] = useState(myCities)
  const [newCity, setNewCity] = useState('')
  const [workSaved, setWorkSaved] = useState(false)
  const [workError, setWorkError] = useState('')
  const [savingWork, setSavingWork] = useState(false)
  const hoursWrong = from >= until

  async function saveWork() {
    setWorkError('')
    setSavingWork(true)
    try {
      const updated = await updateProfile({ work_days: days, work_from: from, work_until: until, work_cities: cities })
      setUser({ ...updated, role: rolePage(updated.role) })
      setWorkSaved(true)
    } catch (err) {
      setWorkError(err.message)
    }
    setSavingWork(false)
  }

  // Every change to days, hours or cities means "not saved" again
  function changed(setter) {
    return (value) => { setter(value); setWorkSaved(false) }
  }

  // Adds your own specialty and chooses it straight away
  function addSkill(event) {
    event.preventDefault()
    const skill = newSkill.trim()
    if (skill === '') return
    if (skill.includes(',')) {
      setSkillsError('A specialty can\'t have a comma in it. Add them one by one.')
      return
    }
    if (!skillOptions.includes(skill)) setSkillOptions([...skillOptions, skill])
    if (!skills.includes(skill)) setSkills([...skills, skill])
    setSkillsSaved(false)
    setNewSkill('')
  }

  // Adds your own city and chooses it straight away
  function addCity(event) {
    event.preventDefault()
    const city = newCity.trim()
    if (city === '') return
    if (city.includes(',')) {
      setWorkError('A city can\'t have a comma in it. Add them one by one.')
      return
    }
    if (!cityOptions.includes(city)) setCityOptions([...cityOptions, city])
    if (!cities.includes(city)) setCities([...cities, city])
    setWorkSaved(false)
    setNewCity('')
  }

  return (
    <>
      <PageHeader
        eyebrow={`Technician · ${profile.name} · My profile`}
        title="What you're good at."
      />

      <div className="page-body stack">
        <section className="card">
          <h2>Your specialties</h2>
          <p className="card-text-small">Pick everything you can fix. The property manager sees this when choosing who to send.</p>
          <ChipGroup
            options={skillOptions}
            value={skills}
            onChange={(newSkills) => { setSkills(newSkills); setSkillsSaved(false) }}
            multiple
          />
          <form className="add-row tight" onSubmit={addSkill}>
            <input
              placeholder="Something else? Type it here"
              aria-label="Add a specialty"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
            />
            <button type="submit" className="btn btn-small">Add</button>
          </form>
          {tooLong && (
            <p className="error">
              Too many specialties to save ({specialtyText.length} of {MAX_SPECIALTY_LENGTH} letters). Remove one or two.
            </p>
          )}
          {skillsError && <p className="error">{skillsError}</p>}
          <div className="card-footer">
            <button type="button" className="btn" onClick={saveSkills} disabled={tooLong || savingSkills}>
              {savingSkills ? 'Saving…' : 'Save specialties'}
            </button>
            {skillsSaved && <span className="saved"><Icon name="check" /> Saved</span>}
          </div>
        </section>

        <section className="card">
          <h2>When and where you work</h2>
          <p className="card-text-small">The property manager sees this when choosing who to send.</p>

          <div className="field">
            <label>Days you are available</label>
            <ChipGroup
              options={weekDays}
              value={days}
              onChange={changed(setDays)}
              multiple
              size="chips-days"
            />
          </div>

          <div className="form-grid even narrow">
            <div className="field">
              <label htmlFor="from">From</label>
              <select id="from" value={from} onChange={(e) => changed(setFrom)(e.target.value)}>
                {hours.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="until">Until</label>
              <select id="until" value={until} onChange={(e) => changed(setUntil)(e.target.value)}>
                {hours.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Cities you work in</label>
            <ChipGroup
              options={cityOptions}
              value={cities}
              onChange={changed(setCities)}
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
          {hoursWrong && <p className="error">"From" must be earlier than "Until".</p>}
          {workError && <p className="error">{workError}</p>}
          <div className="card-footer">
            <button type="button" className="btn" onClick={saveWork} disabled={hoursWrong || savingWork}>
              {savingWork ? 'Saving…' : 'Save days and places'}
            </button>
            {workSaved && <span className="saved"><Icon name="check" /> Saved</span>}
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
