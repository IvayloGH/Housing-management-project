import { useState } from 'react'
import { standardRoomTypes } from '../data/mockData.js'

// The manager says how many rooms of each type a house has, with − and + buttons.
// value: the rooms so far, for example { Bedroom: 6, Kitchen: 1 }
// onChange: gets the new rooms after every click
function RoomTypesEditor({ value, onChange }) {
  const [newType, setNewType] = useState('')

  // The types to show: the standard ones, plus extra ones this house already has (like "Garden")
  const types = [...standardRoomTypes]
  for (const type of Object.keys(value)) {
    if (!types.includes(type)) {
      types.push(type)
    }
  }

  // Sets the number of rooms for one type. 0 means: this house doesn't have it.
  function setCount(type, count) {
    const newRooms = { ...value }
    if (count > 0) {
      newRooms[type] = count
    } else {
      delete newRooms[type]
    }
    onChange(newRooms)
  }

  function addType() {
    const type = newType.trim()
    if (type === '') return
    setCount(type, 1)
    setNewType('')
  }

  return (
    <div className="room-types">
      <div className="room-type-grid">
        {types.map((type) => {
          const count = value[type] || 0
          return (
            <div className={count > 0 ? 'room-type active' : 'room-type'} key={type}>
              <span>{type}</span>
              <div className="stepper">
                <button type="button" aria-label={'Less ' + type} onClick={() => setCount(type, count - 1)} disabled={count === 0}>
                  −
                </button>
                <span className="stepper-count">{count}</span>
                <button type="button" aria-label={'More ' + type} onClick={() => setCount(type, count + 1)}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="add-row tight">
        <input
          placeholder="Other type of room, e.g. Garden"
          aria-label="Other type of room"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the type (and does not send the whole house form)
            if (e.key === 'Enter') {
              e.preventDefault()
              addType()
            }
          }}
        />
        <button type="button" className="btn btn-light btn-small" onClick={addType}>Add type</button>
      </div>
    </div>
  )
}

export default RoomTypesEditor
