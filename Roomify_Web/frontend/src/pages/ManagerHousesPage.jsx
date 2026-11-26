import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Icon from '../components/Icon.jsx'
import housesPhoto from '../assets/building.jpg'
import { useApi } from '../api/useApi.js'
import { addHouse, editHouse, getHouses, getHouseTenants, getTeam, removeTenant } from '../api/roomify.js'

const emptyHouse = { street: '', city: '' }

// The backend keeps name = street and address = "street, city"
function toHouse(h) {
  const city = h.address.includes(', ') ? h.address.slice(h.address.lastIndexOf(', ') + 2) : ''
  return { id: h.house_id, street: h.name, city, tenants: h.tenant_count, openReports: h.open_ticket_count }
}

// The tenants of one house, loaded when you click "Show tenants"
function HouseTenants({ houseId }) {
  const { data, error } = useApi(() => getHouseTenants(houseId), [houseId])
  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="row-sub">Loading…</p>
  if (data.length === 0) return <p className="row-sub">Nobody lives here yet.</p>
  return (
    <ul className="tenant-list">
      {data.map((t) => (
        <li key={t.user_id}>
          <strong>{t.name}</strong> · Room {t.room_number || '-'} · {t.email}
        </li>
      ))}
    </ul>
  )
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
  // The tenants of the house you are editing (null while loading)
  const [tenants, setTenants] = useState(null)
  const [tenantsError, setTenantsError] = useState('')
  // The tenant you pressed the red cross for: the "Are you sure?" window is open while this is set
  const [removing, setRemoving] = useState(null)
  const [removeError, setRemoveError] = useState('')

  const houses = data ? data.houses : []
  const technicians = data ? data.team : []
  const editingHouse = houses.find((h) => h.id === editingId)

  async function loadTenants(houseId) {
    setTenants(null)
    setTenantsError('')
    try {
      setTenants(await getHouseTenants(houseId))
    } catch (err) {
      setTenantsError(err.message)
    }
  }

  function startEdit(house) {
    setEditingId(house.id)
    setEditForm({ street: house.street, city: house.city })
    setHouseError('')
    loadTenants(house.id)
  }

  async function confirmRemove() {
    setRemoveError('')
    try {
      await removeTenant(editingId, removing.user_id)
      setRemoving(null)
      loadTenants(editingId)
      reload() // the tenant count of the house changes
    } catch (err) {
      setRemoveError(err.message)
    }
  }

  async function saveEdit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await editHouse(editingId, editForm.street.trim(), editForm.city.trim())
      setEditingId(null)
      setHouseError('')
      reload()
    } catch (err) {
      setHouseError(err.message)
    }
    setSaving(false)
  }

  async function handleAddHouse(event) {
    event.preventDefault()
    if (!newHouse.street.trim() || !newHouse.city.trim()) {
      setHouseError('Fill in the street and the city.')
      return
    }
    setSaving(true)
    try {
      await addHouse(newHouse.street.trim(), newHouse.city.trim())
      setNewHouse(emptyHouse)
      setHouseError('')
      reload()
    } catch (err) {
      setHouseError(err.message)
    }
    setSaving(false)
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
                {houseError && <p className="error">{houseError}</p>}
                <div className="button-row">
                  <button type="submit" className="btn btn-small" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="link-button" onClick={() => setEditingId(null)}>Cancel</button>
                </div>

                {/* Who lives here. The red cross takes someone out of the house (after "Are you sure?") */}
                <div className="tenant-list">
                  <strong>Tenants</strong>
                  {tenantsError && <p className="error">{tenantsError}</p>}
                  {tenants && tenants.length === 0 && <p className="row-sub">Nobody lives here yet.</p>}
                  {tenants && tenants.map((t) => (
                    <div className="tenant-row" key={t.user_id}>
                      <div className="row-left">
                        <span className="avatar">{t.name[0]}</span>
                        <div>
                          <strong>{t.name}</strong>
                          <p className="row-sub">{t.room_number ? 'Room ' + t.room_number + ' · ' : ''}{t.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-button"
                        aria-label={'Remove ' + t.name + ' from this house'}
                        title="Remove from this house"
                        onClick={() => { setRemoving(t); setRemoveError('') }}
                      >
                        <Icon name="cross" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </form>
            ) : (
              <div key={house.id}>
                <div className="list-row">
                  <div className="row-left">
                    <span className="house-icon" aria-hidden="true"><Icon name="house" size={18} /></span>
                    <div>
                      <strong>{house.street}, {house.city}</strong>
                      <p className="row-sub">{house.tenants} tenants · {house.openReports} open reports</p>
                    </div>
                  </div>
                  <span className="row-actions">
                    {house.tenants > 0 && (
                      <button className="link-button" onClick={() => toggleTenants(house.id)}>
                        {openTenants.includes(house.id) ? 'Hide tenants' : 'Show tenants'}
                      </button>
                    )}
                    <button className="link-button" onClick={() => startEdit(house)}>Edit</button>
                  </span>
                </div>
                {openTenants.includes(house.id) && <HouseTenants houseId={house.id} />}
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
            {houseError && editingId === null && <p className="error">{houseError}</p>}
            <div>
              <button type="submit" className="btn btn-small" disabled={saving}>{saving ? 'Saving…' : 'Add house'}</button>
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

      {/* "Are you sure?" window. Clicking outside it, or Cancel, closes it without removing anyone. */}
      {removing && (
        <div className="confirm-overlay" onClick={() => setRemoving(null)}>
          <div
            className="confirm-box"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title">Remove {removing.name}?</h2>
            <p>
              {removing.name} will no longer live in {editingHouse ? editingHouse.street : 'this house'}: no more
              chores, groceries or repairs here. Their account, past reports and payments stay.
            </p>
            {removeError && <p className="error">{removeError}</p>}
            <div className="button-row">
              <button type="button" className="btn btn-small btn-danger" onClick={confirmRemove}>
                Yes, remove
              </button>
              <button type="button" className="link-button" onClick={() => setRemoving(null)} autoFocus>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ManagerHousesPage
