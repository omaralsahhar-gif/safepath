import React, { useEffect, useState } from 'react'
import { getInstructors, getBookings, supabase } from '../lib/supabase'
import { Button, Card, Modal, Input, Select, Alert, EmptyState, Spinner, Badge } from '../components/UI'
import { Plus, Car, Search, Pencil, Phone, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function Instructors() {
  const [instructors, setInstructors] = useState([])
  const [selected, setSelected] = useState(null)
  const [instructorBookings, setInstructorBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultForm = { full_name: '', email: '', phone: '', qualification: '', specialties: '', notes: '' }
  const [form, setForm] = useState(defaultForm)

  const load = async () => {
    setLoading(true)
    const { data } = await getInstructors()
    setInstructors(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openProfile = async (instructor) => {
    setSelected(instructor)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const b = await getBookings({ instructorId: instructor.id, from: today.toISOString() })
    setInstructorBookings(b.data || [])
    setShowProfile(true)
  }

  const openCreate = () => { setEditing(null); setForm(defaultForm); setShowModal(true) }
  const openEdit = (i) => {
    setEditing(i)
    setForm({ full_name: i.full_name || '', email: i.email || '', phone: i.phone || '', qualification: i.qualification || '', specialties: i.specialties || '', notes: i.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.full_name || !form.email) { setError('Name and email are required.'); return }
    let result
    if (editing) {
      result = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id).select().single()
    } else {
      result = await supabase.from('profiles').insert([{ ...form, role: 'instructor', is_active: true }]).select().single()
    }
    if (result.error) { setError(result.error.message); return }
    setSuccess(editing ? 'Instructor updated.' : 'Instructor added.')
    setShowModal(false)
    load()
  }

  const filtered = instructors.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return i.full_name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) || i.qualification?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructors</h1>
          <p className="text-sm text-gray-500 mt-1">{instructors.length} instructor{instructors.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add instructor</Button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Search instructors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Car} title="No instructors found" action={<Button onClick={openCreate}><Plus size={14} /> Add instructor</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(i => (
            <Card key={i.id} className="hover:border-brand-200 cursor-pointer transition-all" onClick={() => openProfile(i)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                  {i.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{i.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{i.email}</p>
                  {i.qualification && <p className="text-xs text-gray-400 mt-0.5">{i.qualification}</p>}
                  <div className="mt-2 flex gap-1 flex-wrap">
                    <Badge color={i.is_active ? 'green' : 'gray'}>{i.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); openEdit(i) }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                  <Pencil size={13} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Instructor profile modal */}
      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Instructor profile" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                {selected.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selected.full_name}</h3>
                {selected.qualification && <p className="text-sm text-gray-500">{selected.qualification}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600"><Mail size={14} /> {selected.email}</div>
              {selected.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {selected.phone}</div>}
            </div>

            {selected.specialties && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Specialties</p>
                <p className="text-sm text-gray-700">{selected.specialties}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Upcoming lessons ({instructorBookings.length})</h4>
              {instructorBookings.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming lessons.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {instructorBookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                      <div>
                        <p className="text-gray-700">{format(parseISO(b.lesson_datetime), 'EEE d MMM, h:mm a')}</p>
                        <p className="text-xs text-gray-400">{b.student?.full_name}</p>
                      </div>
                      <Badge color={b.status === 'confirmed' ? 'green' : 'gray'}>{b.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit instructor' : 'Add instructor'}>
        <div className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          <Input label="Full name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Qualification" placeholder="e.g. Certificate IV in Driving Instruction" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
          <Input label="Specialties" placeholder="e.g. Highway, Parking, Nervous learners" value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Save changes' : 'Add instructor'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
