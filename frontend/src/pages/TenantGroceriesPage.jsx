import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import { tenantInfo, supplies, youOwe, owedToYou } from '../data/mockData.js'
import Icon from '../components/Icon.jsx'

// Shows money as "€8,40"
function euro(amount) {
  return '€' + amount.toFixed(2).replace('.', ',')
}

function TenantGroceriesPage() {
  const [debts, setDebts] = useState(youOwe)
  const [list, setList] = useState(supplies.filter((s) => s.status !== 'enough'))
  const [newItem, setNewItem] = useState('')
  const [newStatus, setNewStatus] = useState('Running low')

  function markPaid(id) {
    setDebts(debts.map((d) => (d.id === id ? { ...d, paid: true } : d)))
  }

  function changeStatus(id, status) {
    setList(list.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  function bought(id) {
    setList(list.filter((item) => item.id !== id))
  }

  function addItem(event) {
    event.preventDefault()
    if (!newItem.trim()) return
    const item = {
      id: Date.now(),
      name: newItem.trim(),
      addedBy: 'you',
      status: newStatus === 'Out' ? 'out' : 'low',
    }
    setList([...list, item])
    setNewItem('')
  }

  const outCount = list.filter((i) => i.status === 'out').length

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · Shared groceries · ${tenantInfo.house}`}
        title="Shared groceries, fair shares."
        titleMuted="Add what it cost and it's split between everyone."
      />

      <div className="page-body">
        <h2 className="section-title">Balances</h2>
        <div className="grid-2">
          <section className="card">
            <h2>You owe</h2>
            {debts.map((d) => (
              <div className="list-row" key={d.id}>
                <p className="row-text">
                  You owe <strong>{d.person} {euro(d.amount)}</strong> for {d.reason}
                </p>
                {d.paid ? (
                  <span className="saved"><Icon name="check" /> Paid</span>
                ) : (
                  <button className="btn btn-small" onClick={() => markPaid(d.id)}>Mark as paid</button>
                )}
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Owed to you</h2>
            {owedToYou.map((c) => (
              <div className="list-row" key={c.id}>
                <p className="row-text">
                  <strong>{c.person}</strong> owes you <strong>{euro(c.amount)}</strong> for {c.reason}
                </p>
              </div>
            ))}
          </section>
        </div>

        <h2 className="section-title">Shopping list</h2>
        <section className="card">
          <div className="card-head">
            <h2>What the house needs</h2>
            <span className="card-note">{list.length} still to buy · {outCount} out</span>
          </div>

          {list.map((item) => (
            <div className="list-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p className="row-sub">Added by {item.addedBy}</p>
              </div>
              <div className="row-right">
                {item.status === 'out' ? (
                  <StatusDot color="red"><strong>Out</strong></StatusDot>
                ) : (
                  <span className="status">
                    <span className="dot dot-orange" />
                    <select
                      value={item.status}
                      onChange={(e) => changeStatus(item.id, e.target.value)}
                    >
                      <option value="low">Running low</option>
                      <option value="out">Out</option>
                    </select>
                  </span>
                )}
                <button className="btn btn-small" onClick={() => bought(item.id)}>I bought it</button>
              </div>
            </div>
          ))}

          <form className="add-row" onSubmit={addItem}>
            <input
              placeholder="Add an item…"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            {/* Running low / Out joined together, so it doesn't look like the Add button */}
            <div className="segmented" role="group" aria-label="Status of the new item">
              {['Running low', 'Out'].map((label) => (
                <button
                  type="button"
                  key={label}
                  className={newStatus === label ? 'selected' : ''}
                  onClick={() => setNewStatus(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-small">Add</button>
          </form>
        </section>
      </div>
    </>
  )
}

export default TenantGroceriesPage
