import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import RoomTypesEditor from '../components/RoomTypesEditor.jsx'
import { describeRooms } from '../utils/describeRooms.js'
import { houses as startHouses, technicians as startTechnicians } from '../data/mockData.js'
import Icon from '../components/Icon.jsx'
import housesPhoto from '../assets/photos/manager-houses.jpg'

const emptyHouse = { street: '', city: '', roomTypes: { Bedroom: 1, Kitchen: 1, Bathroom: 1 } }

function ManagerHousesPage() {
  const [houses, setHouses] = useState(startHouses)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyHouse)
  const [newHouse, setNewHouse] = useState(emptyHouse)
  const [houseError, setHouseError] = useState('')
  const [technicians, setTechnicians] = useState(startTechnicians)
  const [newTech, setNewTech] = useState('')

  function startEdit(house) {
    setEditingId(house.id)
    setEditForm({ street: house.street, city: house.city, roomTypes: house.roomTypes })
  }

  function saveEdit(event) {
    event.preventDefault()
    setHouses(houses.map((h) => (h.id === editingId ? { ...h, ...editForm } : h)))
    setEditingId(null)
  }

  function addHouse(event) {
    event.preventDefault()
    if (!newHouse.street.trim() || !newHouse.city.trim()) {
      setHouseError('Fill in the street and the city.')
      return
    }
    if (Object.keys(newHouse.roomTypes).length === 0) {
      setHouseError('Add at least one room.')
      return
    }
    setHouses([...houses, { id: Date.now(), ...newHouse, tenants: 0 }])
    setNewHouse(emptyHouse)
    setHouseError('')
  }

  function addTechnician(event) {
    event.preventDefault()
    if (!newTech.trim()) return
    setTechnicians([...technicians, { id: Date.now(), name: newTech.trim(), skills: '' }])
    setNewTech('')
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
                <p className="label-strong">Rooms in this house</p>
                <RoomTypesEditor
                  value={editForm.roomTypes}
                  onChange={(roomTypes) => setEditForm({ ...editForm, roomTypes })}
                />
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
                    <p className="row-sub">{describeRooms(house.roomTypes)} · {house.tenants} tenants</p>
                  </div>
                </div>
                <button className="link-button" onClick={() => startEdit(house)}>Edit</button>
              </div>
            )
          )}

          <form className="list-row stacked" onSubmit={addHouse}>
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
            <p className="label-strong">Rooms in this house</p>
            <RoomTypesEditor
              value={newHouse.roomTypes}
              onChange={(roomTypes) => setNewHouse({ ...newHouse, roomTypes })}
            />
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
            <div className="list-row" key={t.id}>
              <div className="row-left">
                <span className="avatar">{t.name[0]}</span>
                <div>
                  <strong>{t.name}</strong>
                  {t.skills && <p className="row-sub">{t.skills}</p>}
                </div>
              </div>
            </div>
          ))}

          <form className="list-row stacked" onSubmit={addTechnician}>
            <strong>Add a technician</strong>
            <div className="add-row tight">
              <input
                placeholder="Their name, e.g. Sofia Marin"
                aria-label="Technician name"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
              />
              <button type="submit" className="btn btn-small">Add</button>
            </div>
          </form>
        </section>
      </div>
    </>
  )
}

export default ManagerHousesPage
