import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { CATEGORIES, UNITS, categoryLabel, defaultUnitFor } from '../../utils/categories'

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const priorityStyle = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
}

const statusStyle = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-200 text-gray-600',
}

const emptyForm = {
  category: 'food',
  item_name: '',
  quantity_required: '',
  unit: 'kg',
  priority: 'medium',
  expires_at: '',
  description: '',
}

function updatedLabel(updatedAt) {
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (days < 1) return { text: 'Updated today', color: 'text-green-600' }
  if (days < 7) return { text: 'Updated this week', color: 'text-gray-500' }
  return { text: 'Needs review', color: 'text-orange-600' }
}

function isExpired(req) {
  return req.expires_at && new Date(req.expires_at) < new Date()
}

export default function NGORequirements() {
  const { user, profile } = useAuth()
  const [requirements, setRequirements] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [receivedInput, setReceivedInput] = useState({})
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) loadRequirements()
  }, [user])

  function showMessage(type, text) {
    setMessage({ type, text })
  }

  async function loadRequirements() {
    setLoading(true)
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('ngo_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load requirements:', error)
      showMessage('error', 'Unable to load your requirements. Please refresh the page and try again.')
    } else {
      setRequirements(data || [])
    }
    setLoading(false)
  }

  function updateField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'category') next.unit = defaultUnitFor(value)
      return next
    })
  }

  function startCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setMessage(null)
  }

  function startEdit(req) {
    setForm({
      category: req.category,
      item_name: req.item_name,
      quantity_required: String(req.quantity_required),
      unit: req.unit,
      priority: req.priority,
      expires_at: req.expires_at ? req.expires_at.slice(0, 10) : '',
      description: req.description || '',
    })
    setEditingId(req.id)
    setShowForm(true)
    setMessage(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    const quantity = parseFloat(form.quantity_required)
    if (!form.item_name.trim()) {
      showMessage('error', 'Item name is required.')
      return
    }
    if (!quantity || quantity <= 0) {
      showMessage('error', 'Quantity required must be greater than zero.')
      return
    }

    setSaving(true)
    const payload = {
      category: form.category,
      item_name: form.item_name.trim(),
      quantity_required: quantity,
      unit: form.unit,
      priority: form.priority,
      description: form.description.trim() || null,
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
    }

    const { error } = editingId
      ? await supabase.from('requirements').update(payload).eq('id', editingId)
      : await supabase.from('requirements').insert({ ...payload, ngo_id: user.id })

    setSaving(false)

    if (error) {
      console.error('Failed to save requirement:', error)
      showMessage('error', `The requirement could not be saved: ${error.message}`)
      return
    }

    showMessage('success', editingId ? 'Requirement updated.' : 'Requirement created.')
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    loadRequirements()
  }

  async function setStatus(req, status) {
    const { error } = await supabase.from('requirements').update({ status }).eq('id', req.id)
    if (error) {
      showMessage('error', `Unable to change the status: ${error.message}`)
      return
    }
    showMessage('success', `Requirement ${status === 'active' ? 'resumed' : status}.`)
    loadRequirements()
  }

  async function addReceived(req) {
    const amount = parseFloat(receivedInput[req.id])
    if (!amount || amount <= 0) {
      showMessage('error', 'Enter a received quantity greater than zero.')
      return
    }
    const { error } = await supabase
      .from('requirements')
      .update({ quantity_received: Number(req.quantity_received) + amount })
      .eq('id', req.id)

    if (error) {
      showMessage('error', `Unable to update the received quantity: ${error.message}`)
      return
    }
    setReceivedInput((prev) => ({ ...prev, [req.id]: '' }))
    showMessage('success', 'Received quantity updated.')
    loadRequirements()
  }

  async function deleteRequirement(req) {
    if (!window.confirm(`Delete the requirement "${req.item_name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('requirements').delete().eq('id', req.id)
    if (error) {
      showMessage('error', `Unable to delete the requirement: ${error.message}`)
      return
    }
    showMessage('success', 'Requirement deleted.')
    loadRequirements()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-eco-green">My Requirements</h1>
        {!showForm && (
          <button onClick={startCreate} className="bg-eco-green text-white px-3 py-1.5 rounded text-sm font-medium">
            Add requirement
          </button>
        )}
      </div>
      <p className="text-gray-500 mb-4">
        List what your organization currently needs. Donors see active requirements from verified organizations.
      </p>

      {profile && !profile.is_verified && (
        <p className="text-sm p-2 bg-yellow-50 text-yellow-800 rounded mb-4">
          Your organization is not verified yet. You can create requirements now, but donors will only see them after
          an administrator verifies your account.
        </p>
      )}

      {message && (
        <p className={`text-sm p-2 rounded mb-4 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-xl shadow space-y-3 mb-6">
          <h2 className="font-semibold">{editingId ? 'Edit requirement' : 'New requirement'}</h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Category
              <select className="w-full border rounded p-2 mt-1" value={form.category}
                onChange={(e) => updateField('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Priority
              <select className="w-full border rounded p-2 mt-1" value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <label className="text-sm block">
            Item name
            <input className="w-full border rounded p-2 mt-1" placeholder="e.g. Cooked meals, Winter blankets"
              value={form.item_name} onChange={(e) => updateField('item_name', e.target.value)} required />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Quantity required
              <input className="w-full border rounded p-2 mt-1" type="number" min="0" step="0.1"
                value={form.quantity_required} onChange={(e) => updateField('quantity_required', e.target.value)} required />
            </label>
            <label className="text-sm">
              Unit
              <select className="w-full border rounded p-2 mt-1" value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
          </div>

          <label className="text-sm block">
            Needed until (optional)
            <input className="w-full border rounded p-2 mt-1" type="date" value={form.expires_at}
              onChange={(e) => updateField('expires_at', e.target.value)} />
          </label>

          <label className="text-sm block">
            Notes for donors (optional)
            <textarea className="w-full border rounded p-2 mt-1" rows="2" value={form.description}
              onChange={(e) => updateField('description', e.target.value)} />
          </label>

          <div className="flex gap-2">
            <button disabled={saving} type="submit"
              className="bg-eco-green text-white px-4 py-2 rounded font-medium disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create requirement'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }}
              className="border px-4 py-2 rounded text-gray-600">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-gray-400">Loading requirements...</p>}

      <div className="space-y-3">
        {requirements.map((req) => {
          const expired = isExpired(req)
          const fresh = updatedLabel(req.updated_at)
          const remaining = Number(req.quantity_remaining)
          const pct = Math.min(100, Math.round((Number(req.quantity_received) / Number(req.quantity_required)) * 100))
          return (
            <div key={req.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium">{req.item_name}</p>
                  <p className="text-sm text-gray-500">{categoryLabel(req.category)}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityStyle[req.priority]}`}>
                    {req.priority} priority
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expired ? 'bg-red-100 text-red-700' : statusStyle[req.status]}`}>
                    {expired ? 'expired' : req.status}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 bg-eco-green rounded" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {req.quantity_received} of {req.quantity_required} {req.unit} received
                  {remaining > 0 && ` (${remaining} ${req.unit} remaining)`}
                </p>
                <p className={`text-xs mt-1 ${fresh.color}`}>
                  {fresh.text}
                  {req.expires_at && ` | Needed until ${new Date(req.expires_at).toLocaleDateString()}`}
                </p>
                {req.description && <p className="text-sm text-gray-500 mt-1">{req.description}</p>}
              </div>

              <div className="flex gap-2 mt-3 flex-wrap items-center">
                {req.status !== 'closed' && (
                  <>
                    <input type="number" min="0" step="0.1" placeholder="Qty received"
                      className="border rounded p-1 text-sm w-28"
                      value={receivedInput[req.id] || ''}
                      onChange={(e) => setReceivedInput((prev) => ({ ...prev, [req.id]: e.target.value }))} />
                    <button onClick={() => addReceived(req)} className="border px-2 py-1 rounded text-sm">
                      Add received
                    </button>
                  </>
                )}
                <button onClick={() => startEdit(req)} className="border px-2 py-1 rounded text-sm">Edit</button>
                {req.status === 'active' && (
                  <button onClick={() => setStatus(req, 'paused')} className="border px-2 py-1 rounded text-sm">Pause</button>
                )}
                {req.status === 'paused' && (
                  <button onClick={() => setStatus(req, 'active')} className="border px-2 py-1 rounded text-sm">Resume</button>
                )}
                {req.status !== 'closed' && (
                  <button onClick={() => setStatus(req, 'closed')} className="border px-2 py-1 rounded text-sm">Close</button>
                )}
                {req.status === 'closed' && remaining > 0 && (
                  <button onClick={() => setStatus(req, 'active')} className="border px-2 py-1 rounded text-sm">Reopen</button>
                )}
                <button onClick={() => deleteRequirement(req)}
                  className="text-red-500 border border-red-200 px-2 py-1 rounded text-sm">
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {!loading && requirements.length === 0 && (
          <p className="text-gray-400">No requirements yet. Select "Add requirement" to tell donors what you need.</p>
        )}
      </div>
    </div>
  )
}
