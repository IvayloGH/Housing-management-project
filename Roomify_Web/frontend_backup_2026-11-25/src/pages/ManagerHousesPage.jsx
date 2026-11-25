import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Icon from '../components/Icon.jsx'
import housesPhoto from '../assets/photos/manager-houses.jpg'
import { useApi } from '../api/useApi.js'
import { addHouse, editHouse, getHouses, getTeam } from '../api/roomify.js'

const emptyHouse = { street: '', city: '' }

// The backend keeps name = street and address = "street, city"
function toHouse(h) {
  const city = h.address.includes(', ') ? h.address.slice(h.address.lastIndexOf(', ') + 2) : ''
  return { id: h.house_id, street: h.name, city, tenants: h.tenant_count, openReports: h.open_ticket_count }
}

async function loadHousesAndTeam() {
  const [houses, team] = await Promise.all([getHouses(), getTeam()])
  return { houses: houses.map(toHouse), team }
}

function ManagerHousesPage() {
  const { data, error, reload } = useApi(loadHousesAndTeam)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyHouse)
  const [newHouse, setNewHouse] = useState(emptyHouse)
  const [houseError, setHouseError] = useState('')

  const houses = data ? data.houses : []
  const technicians = data ? data.team : []

  function startEdit(house) {
    setEditingId(house.id)
    setEditForm({ street: house.street, city: house.city })
    setHouseError('')
  }

  async function saveEdit(event) {
    event.preventDefault()
    try {
      await editHouse(editingId, editForm.street.trim(), editForm.city.trim())
      setEditingId(null)
      reload()
    } catch (err) {
      setHouseError(err.message)
    }
  }

  async function handleAddHouse(event) {
    event.preventDefault()
    if (!newHouse.street.trim() || !newHouse.city.trim()) {
      setHouseError('Fill in the street and the city.')
      return
    }
    try {
      await addHouse(newHouse.street.trim(), newHouse.city.trim())
      setNewHouse(emptyHouse)
      setHouseError('')
      reload()
    } catch (err) {
      setHouseError(err.message)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Property manager · Houses & technicians"
        title="Your houses and team."
        titleMuted="Roomify uses them to suggest who to send."
        image={housesPhoto}
      />

      <div className="page-body stack">
        {error && <p className="error">{error}</p>}

        <section className="card">
          <div className="card-head">
            <h2>Your houses</h2>
            <span className="card-note">{houses.length} houses</span>
          </div>

          {houses.map((house) =>
            house.id === editingId ? (
              <form className="list-row stacked" key={house.id} onSubmit={saveEdit}>
                <strong>Edit house</strong>
                <div className="house-fields two">
                  <div className="field">
                    <label htmlFor="edit-street">Street and number</label>
                    <input id="edit-street" value={editForm.street}
                      onChange={(e) => setEditForm({ ...editForm, street: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-city">City</label>
                    <input id="edit-city" value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} required />
                  </div>
                </div>
                <div className="button-row">
                  <button type="submit" className="btn btn-small">Save</button>
                  <button type="button" className="link-button" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="list-row" key={house.id}>
                <div className="row-left">
                  <span className="house-icon" aria-hidden="true"><Icon name="house" size={18} /></span>
                  <div>
                    <strong>{house.street}, {house.city}</strong>
                    <p className="row-sub">{house.tenants} tenants · {house.openReports} open reports</p>
                  </div>
                </div>
                <button className="link-button" onClick={() => startEdit(house)}>Edit</button>
              </div>
            )
          )}

          <form className="list-row stacked" onSubmit={handleAddHouse}>
            <strong>Add a house</strong>
            <div className="house-fields two">
              <div className="field">
                <label htmlFor="new-street">Street and number</label>
                <input id="new-street" placeholder="e.g. Kerkstraat 12" value={newHouse.street}
                  onChange={(e) => setNewHouse({ ...newHouse, street: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="new-city">City</label>
                <input id="new-city" placeholder="e.g. Eindhoven" value={newHouse.city}
                  onChange={(e) => setNewHouse({ ...newHouse, city: e.target.value })} />
              </div>
            </div>
            <p className="row-sub">Tenants join this house by filling in the same street and city when they sign up.</p>
            {houseError && <p className="error">{houseError}</p>}
            <div>
              <button type="submit" className="btn btn-small">Add house</button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Your technicians</h2>
            <span className="card-note">{technicians.length} technicians</span>
          </div>

          {technicians.map((t) => (
            <div className="list-row" key={t.user_id}>
              <div className="row-left">
                <span className="avatar">{t.name[0]}</span>
                <div>
                  <strong>{t.name}</strong>
                  {t.specialty && <p className="row-sub">{t.specialty}</p>}
                </div>
              </div>
            </div>
          ))}

          <p className="row-sub">New technicians get their account from the Roomify team.</p>
        </section>
      </div>
    </>
  )
}

export default ManagerHousesPage
