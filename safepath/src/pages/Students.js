import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getStudents, getBookings, supabase } from '../lib/supabase'
import { Button, Card, Modal, Input, Select, Alert, EmptyState, Spinner, Badge } from '../components/UI'
import { Plus, Users, Search, Pencil, Phone, Mail, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function Students() {
  const { profile } = useAuth()
  const role = profile?.role
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState(null)
  const [studentBookings, setStudentBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultForm = { full_name: '', email: '', phone: '', date_of_birth: '', licence_type: 'learner', notes: '' }
  const [form, setForm] = useState(defaultForm)

  const load = async () => {
    setLoading(true)
    let data
    if (role === 'instructor') {
      // Instructors see only their students
      const bookings = await getBookings({ instructorId: profile.id })
      const ids = [...new Set(bookings.data?.map(b => b.student_id) || [])]
      if (ids.length) {
        const res = await supabase.from('profiles').select('*').in('id', ids)
        data = res.data
      } else data = []
    } else {
      const res = await getStudents()
      data = res.data || []
    }
    setStudents(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openProfile = async (student) => {
    setSelected(student)
    const b = await getBookings({ studentId: student.id })
    setStudentBookings(b.data || [])
    setShowProfile(true)
  }

  const openCreate = () => { setEditing(null); setForm(defaultForm); setShowModal(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ full_name: s.full_name || '', email: s.email || '', phone: s.phone || '', date_of_birth: s.date_of_birth || '', licence_type: s.licence_type || 'learner', notes: s.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.full_name || !form.email) { setError('Name and email are required.'); return }
    let result
    if (editing) {
      result = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id).select().single()
    } else {
      // Create auth user + profile via admin (in real setup, invite flow)
      result = await supabase.from('profiles').insert([{ ...form, role: 'student', is_active: true }]).select().single()
    }
    if (result.error) { setError(result.error.message); return }
    setSuccess(editing ? 'Student updated.' : 'Student added.')
    setShowModal(false)
    load()
  }

  const filtered = students.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.phone?.includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{role === 'instructor' ? 'My Students' : 'Students'}</h1>
          <p className="text-sm text-gray-500 mt-1">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
        </div>
        {role === 'manager' && <Button onClick={openCreate}><Plus size={16} /> Add student</Button>}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Users} title="No students found" action={role === 'manager' && <Button onClick={openCreate}><Plus size={14} /> Add student</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Card key={s.id} className="hover:border-brand-200 cursor-pointer transition-all" onClick={() => openProfile(s)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                  {s.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.email}</p>
                  {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                  <div className="mt-2 flex gap-1 flex-wrap">
                    <Badge color={s.is_active ? 'green' : 'gray'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    {s.licence_type && <Badge color="blue">{s.licence_type}</Badge>}
                  </div>
                </div>
                {role === 'manager' && (
                  <button onClick={e => { e.stopPropagation(); openEdit(s) }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Student profile modal */}
      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Student profile" size="lg">
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg shrink-0">
                {selected.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selected.full_name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge color={selected.is_active ? 'green' : 'gray'}>{selected.is_active ? 'Active' : 'Inactive'}</Badge>
                  {selected.licence_type && <Badge color="blue">{selected.licence_type} licence</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600"><Mail size={14} /> {selected.email}</div>
              {selected.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {selected.phone}</div>}
              {selected.date_of_birth && <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} /> DOB: {format(parseISO(selected.date_of_birth), 'd MMM yyyy')}</div>}
            </div>

            {selected.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{selected.notes}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Booking history ({studentBookings.length})</h4>
              {studentBookings.length === 0 ? (
                <p className="text-sm text-gray-500">No bookings yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {studentBookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                      <span className="text-gray-700">{format(parseISO(b.lesson_datetime), 'EEE d MMM, h:mm a')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{b.duration_minutes}m</span>
                        <Badge color={b.status === 'completed' ? 'blue' : b.status === 'confirmed' ? 'green' : 'gray'}>{b.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit student' : 'Add student'}>
        <div className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          <Input label="Full name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
          <Select label="Licence type" value={form.licence_type} onChange={e => setForm(f => ({ ...f, licence_type: e.target.value }))}>
            <option value="learner">Learner</option>
            <option value="provisional">Provisional</option>
            <option value="full">Full</option>
          </Select>
          <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Save changes' : 'Add student'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
