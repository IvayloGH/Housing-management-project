import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatusDot from '../components/StatusDot.jsx'
import Icon from '../components/Icon.jsx'
import { useApi } from '../api/useApi.js'
import { useUser } from '../api/userContext.js'
import {
  addExpense, addGrocery, deleteGrocery, getExpenses, getGroceries, markBought, settleShare,
} from '../api/roomify.js'
import { firstName } from '../api/convert.js'

// Shows money as "€8,40"
function euro(amount) {
  return '€' + Number(amount).toFixed(2).replace('.', ',')
}

async function loadGroceries() {
  const [groceries, expenses] = await Promise.all([getGroceries(), getExpenses()])
  return { groceries, expenses }
}

// Who owes whom, from the list of expenses. Only shares that are not paid back yet.
function balances(expenses, myId) {
  const youOwe = []
  const owedToYou = []
  for (const expense of expenses) {
    for (const share of expense.shares) {
      if (share.is_settled) continue
      const row = {
        key: expense.expense_id + '-' + share.tenant_id,
        expenseId: expense.expense_id,
        tenantId: share.tenant_id,
        amount: share.amount_owed,
        reason: expense.description || 'shared shopping',
      }
      if (share.tenant_id === myId && expense.paid_by !== myId) {
        youOwe.push({ ...row, person: firstName(expense.paid_by_name) })
      } else if (expense.paid_by === myId && share.tenant_id !== myId) {
        owedToYou.push({ ...row, person: firstName(share.tenant_name) })
      }
    }
  }
  return { youOwe, owedToYou }
}

function TenantGroceriesPage() {
  const { user: profile } = useUser()
  const { data, error, reload } = useApi(loadGroceries)
  const [newItem, setNewItem] = useState('')
  // The item you are buying right now, and what it cost
  const [buyingId, setBuyingId] = useState(null)
  const [price, setPrice] = useState('')
  const [actionError, setActionError] = useState('')
  // The button that is being saved right now (so it can't be clicked twice)
  const [busy, setBusy] = useState('')
  // Items whose cost is already saved as an expense, but "bought" failed: don't save the cost twice
  const costSaved = useRef(new Set())
  // Debts you just paid with PAY: shown with a tick until the page is opened again
  const [justPaid, setJustPaid] = useState([])

  // "PAY": there is no real payment in Roomify, it only marks your share as paid back
  async function pay(debt) {
    setActionError('')
    setBusy('pay-' + debt.key)
    try {
      await settleShare(debt.expenseId, debt.tenantId)
      setJustPaid([...justPaid, debt])
      reload()
    } catch (err) {
      setActionError(err.message)
    }
    setBusy('')
  }

  // Runs a change on the backend, then loads the page data again
  async function change(key, action) {
    setActionError('')
    setBusy(key)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(err.message)
    }
    setBusy('')
  }

  function addItem(event) {
    event.preventDefault()
    if (!newItem.trim()) return
    change('add', async () => {
      await addGrocery(newItem.trim())
      setNewItem('')
    })
  }

  // "I bought it": if you fill in a price, split it with the house first, then mark it bought.
  // In this order a failed save never hides an item whose cost was not shared.
  function saveBought(event, item) {
    event.preventDefault()
    const amount = Number(price.replace(',', '.'))
    if (price !== '' && !(amount > 0)) {
      setActionError('Fill in a price like 3,50 or leave it empty.')
      return
    }
    change('buy-' + item.item_id, async () => {
      if (amount > 0 && !costSaved.current.has(item.item_id)) {
        await addExpense(item.name, amount.toFixed(2))
        costSaved.current.add(item.item_id)
      }
      await markBought(item.item_id)
      costSaved.current.delete(item.item_id)
      setBuyingId(null)
      setPrice('')
    })
  }

  const myId = profile.user_id
  const list = data ? data.groceries.filter((g) => !g.is_bought) : []
  const { youOwe, owedToYou } = data ? balances(data.expenses, myId) : { youOwe: [], owedToYou: [] }
  // Still owed, plus the ones you just paid (after a reload they are no longer in youOwe)
  const paidKeys = justPaid.map((d) => d.key)
  // Newest expense first (like the backend's list), so a paid line stays where it was
  const debtRows = [...youOwe.filter((d) => !paidKeys.includes(d.key)), ...justPaid]
    .sort((a, b) => b.expenseId - a.expenseId)

  return (
    <>
      <PageHeader
        eyebrow={`Tenant · Shared groceries${profile.house_name ? ' · ' + profile.house_name : ''}`}
        title="Shared groceries, fair shares."
        titleMuted="Add what it cost and it's split between everyone."
      />

      <div className="page-body">
        {(error || actionError) && <p className="error">{error || actionError}</p>}

        <h2 className="section-title">Balances</h2>
        <div className="grid-2">
          <section className="card">
            <h2>You owe</h2>
            {data && debtRows.length === 0 && <p className="saved"><Icon name="check" /> You don't owe anyone</p>}
            {debtRows.map((d) =>
              paidKeys.includes(d.key) ? (
                <div className="list-row" key={d.key}>
                  <p className="row-text">
                    You paid <strong>{d.person} {euro(d.amount)}</strong> for {d.reason}
                  </p>
                  <span className="saved"><Icon name="check" /> Paid</span>
                </div>
              ) : (
                <div className="list-row" key={d.key}>
                  <p className="row-text">
                    You owe <strong>{d.person} {euro(d.amount)}</strong> for {d.reason}
                  </p>
                  <button className="btn btn-small" disabled={busy !== ''} onClick={() => pay(d)}>
                    {busy === 'pay-' + d.key ? 'Paying…' : 'PAY'}
                  </button>
                </div>
              ),
            )}
          </section>

          <section className="card">
            <h2>Owed to you</h2>
            {data && owedToYou.length === 0 && <p className="row-sub">Nobody owes you money.</p>}
            {owedToYou.map((c) => (
              <div className="list-row" key={c.key}>
                <p className="row-text">
                  <strong>{c.person}</strong> owes you <strong>{euro(c.amount)}</strong> for {c.reason}
                </p>
                <button
                  className="btn btn-small"
                  disabled={busy !== ''}
                  onClick={() => change('settle-' + c.key, () => settleShare(c.expenseId, c.tenantId))}
                >
                  {busy === 'settle-' + c.key ? 'Saving…' : 'Paid me back'}
                </button>
              </div>
            ))}
          </section>
        </div>

        <h2 className="section-title">Shopping list</h2>
        <section className="card">
          <div className="card-head">
            <h2>What the house needs</h2>
            <span className="card-note">{list.length} still to buy</span>
          </div>

          {list.map((item) => (
            <div className="list-row" key={item.item_id}>
              <div>
                <strong>{item.name}</strong>
                {item.quantity > 1 && <p className="row-sub">{item.quantity} needed</p>}
              </div>
              {buyingId === item.item_id ? (
                <form className="row-right" onSubmit={(e) => saveBought(e, item)}>
                  <input
                    className="price-input"
                    inputMode="decimal"
                    placeholder="Price, e.g. 3,50"
                    aria-label={'What did ' + item.name + ' cost?'}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-small" disabled={busy !== ''}>
                    {busy === 'buy-' + item.item_id ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="link-button" onClick={() => setBuyingId(null)}>Cancel</button>
                </form>
              ) : (
                <div className="row-right">
                  <StatusDot color="orange">To buy</StatusDot>
                  <span className="row-actions">
                    <button
                      className="btn btn-small"
                      disabled={busy !== ''}
                      onClick={() => { setBuyingId(item.item_id); setPrice('') }}
                    >
                      I bought it
                    </button>
                    <button
                      className="link-button"
                      disabled={busy !== ''}
                      aria-label={'Remove ' + item.name + ' from the list'}
                      onClick={() => change('remove-' + item.item_id, () => deleteGrocery(item.item_id))}
                    >
                      {busy === 'remove-' + item.item_id ? 'Removing…' : 'Remove'}
                    </button>
                  </span>
                </div>
              )}
            </div>
          ))}

          <form className="add-row" onSubmit={addItem}>
            <input
              placeholder="Add an item…"
              aria-label="Add an item to the shopping list"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <button type="submit" className="btn btn-small" disabled={busy !== ''}>
              {busy === 'add' ? 'Adding…' : 'Add'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}

export default TenantGroceriesPage
