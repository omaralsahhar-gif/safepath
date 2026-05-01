import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBookings, createBooking, updateBooking, deleteBooking, getInstructors, getStudents, checkAvailability } from '../lib/supabase'
import { Button, Card, Modal, Input, Select, Textarea, StatusBadge, Alert, EmptyState, Spinner, Badge } from '../components/UI'
import { Plus, Calendar, Pencil, Trash2, Search } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const STATUS_OPTIONS = ['confirmed', 'completed', 'cancelled', 'pending']
const DURATION_OPTIONS = [30, 45, 60, 90, 120]

export default function Bookings() {
  const { profile } = useAuth()
  const role = profile?.role
  const [bookings, setBookings] = useState([])
  const [instructors, setInstructors] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultForm = {
    student_id: role === 'student' ? profile.id : '',
    instructor_id: role === 'instructor' ? profile.id : '',
    lesson_datetime: '',
    duration_minutes: 60,
    location: '',
    notes: '',
    status: 'confirmed',
  }
  const [form, setForm] = useState(defaultForm)
  const [availCheck, setAvailCheck] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const filters = {}
    if (role === 'student') filters.studentId = profile.id
    if (role === 'instructor') filters.instructorId = profile.id
    if (statusFilter) filters.status = statusFilter

    const [b, instr, studs] = await Promise.all([
      getBookings(filters),
      role !== 'student' ? getInstructors() : { data: [] },
      role === 'manager' ? getStudents() : { data: [] },
    ])
    setBookings(b.data || [])
    setInstructors(instr.data || [])
    setStudents(studs.data || [])
    setLoading(false)
  }, [role, profile?.id, statusFilter])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(defaultForm); setAvailCheck(null); setShowModal(true) }
  const openEdit = (b) => {
    setEditing(b)
    setForm({
      student_id: b.student_id,
      instructor_id: b.instructor_id,
      lesson_datetime: b.lesson_datetime?.slice(0, 16),
      duration_minutes: b.duration_minutes,
      location: b.location || '',
      notes: b.notes || '',
      status: b.status,
    })
    setAvailCheck(null)
    setShowModal(true)
  }

  const handleCheckAvailability = async () => {
    if (!form.instructor_id || !form.lesson_datetime) return
    const { available } = await checkAvailability(form.instructor_id, form.lesson_datetime, form.duration_minutes)
    setAvailCheck(available)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.student_id || !form.instructor_id || !form.lesson_datetime) {
      setError('Please fill in all required fields.')
      return
    }
    const payload = { ...form, duration_minutes: parseInt(form.duration_minutes) }
    let result
    if (editing) {
      result = await updateBooking(editing.id, payload)
    } else {
      result = await createBooking(payload)
    }
    if (result.error) { setError(result.error.message); return }
    setSuccess(editing ? 'Booking updated.' : 'Booking created successfully.')
    setShowModal(false)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    const { error } = await deleteBooking(deleting.id)
    if (error) { setError(error.message); return }
    setSuccess('Booking deleted.')
    setDeleting(null)
    load()
  }

  const filtered = bookings.filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      b.student?.full_name?.toLowerCase().includes(s) ||
      b.instructor?.full_name?.toLowerCase().includes(s) ||
      b.location?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{role === 'student' ? 'My Lessons' : role === 'instructor' ? 'My Schedule' : 'Bookings'}</h1>
          <p className="text-sm text-gray-500 mt-1">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} found</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus size={16} /> New booking
        </Button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Search by name or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState icon={Calendar} title="No bookings found" description="Try adjusting your filters or create a new booking." action={<Button onClick={openCreate}><Plus size={14} /> New booking</Button>} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 font-medium">
                  <th className="text-left px-4 py-3">Date & time</th>
                  {role !== 'student' && <th className="text-left px-4 py-3">Student</th>}
                  {role !== 'instructor' && <th className="text-left px-4 py-3">Instructor</th>}
                  <th className="text-left px-4 py-3">Duration</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {b.lesson_datetime ? format(parseISO(b.lesson_datetime), 'EEE d MMM, h:mm a') : '—'}
                    </td>
                    {role !== 'student' && <td className="px-4 py-3 text-gray-700">{b.student?.full_name || '—'}</td>}
                    {role !== 'instructor' && <td className="px-4 py-3 text-gray-700">{b.instructor?.full_name || '—'}</td>}
                    <td className="px-4 py-3 text-gray-500">{b.duration_minutes} min</td>
                    <td className="px-4 py-3 text-gray-500">{b.location || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"><Pencil size={13} /></button>
                        {role === 'manager' && <button onClick={() => setDeleting(b)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit booking' : 'New booking'} size="md">
        <div className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {role === 'manager' && (
            <Select label="Student *" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Select>
          )}

          {(role === 'manager' || role === 'student') && (
            <Select label="Instructor *" value={form.instructor_id} onChange={e => { setForm(f => ({ ...f, instructor_id: e.target.value })); setAvailCheck(null) }}>
              <option value="">Select instructor</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Date & time *" type="datetime-local" value={form.lesson_datetime} onChange={e => { setForm(f => ({ ...f, lesson_datetime: e.target.value })); setAvailCheck(null) }} />
            <Select label="Duration" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}>
              {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}
            </Select>
          </div>

          {/* Availability checker */}
          {!editing && (
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleCheckAvailability} disabled={!form.instructor_id || !form.lesson_datetime}>
                Check availability
              </Button>
              {availCheck === true && <Badge color="green">✓ Available</Badge>}
              {availCheck === false && <Badge color="red">✗ Not available</Badge>}
            </div>
          )}

          <Input label="Location" placeholder="e.g. 12 Main St, Parramatta" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />

          <Textarea label="Notes" placeholder="Any special notes for this lesson..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

          {(role === 'manager' || role === 'instructor') && (
            <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Save changes' : 'Create booking'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete booking" size="sm">
        <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this booking? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
