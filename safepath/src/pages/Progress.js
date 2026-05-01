import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProgressRecords, createProgressRecord, updateProgressRecord, getStudents, getBookings, supabase } from '../lib/supabase'
import { Button, Card, Modal, Select, Textarea, StatusBadge, Alert, EmptyState, Spinner, Badge } from '../components/UI'
import { Plus, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const SKILLS = [
  'Road rules & theory', 'Starting & stopping', 'Steering control',
  'Gear changes (manual)', 'Speed management', 'Lane changing',
  'Merging', 'Roundabouts', 'Intersections & give way',
  'Reversing', 'Parallel parking', 'Angle parking',
  'Three-point turn', 'Freeway/highway driving', 'Night driving',
  'Driving in rain', 'School zones & pedestrians', 'Emergency stops',
]

const LEVELS = ['beginner', 'developing', 'proficient']

export default function Progress() {
  const { profile } = useAuth()
  const role = profile?.role

  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(role === 'student' ? profile.id : '')
  const [records, setRecords] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultForm = { booking_id: '', skill_name: SKILLS[0], skill_level: 'beginner', instructor_feedback: '' }
  const [form, setForm] = useState(defaultForm)

  // Load student list
  useEffect(() => {
    if (role === 'manager') {
      getStudents().then(({ data }) => setStudents(data || []))
    } else if (role === 'instructor') {
      getBookings({ instructorId: profile.id }).then(({ data }) => {
        const ids = [...new Set(data?.map(b => b.student_id) || [])]
        if (ids.length) {
          supabase.from('profiles').select('*').in('id', ids).then(({ data: studs }) => setStudents(studs || []))
        }
      })
    }
  }, [role, profile?.id])

  // Load records when student selected
  const loadRecords = useCallback(async () => {
    if (!selectedStudent) return
    setLoading(true)
    const [recs, bkgs] = await Promise.all([
      getProgressRecords(selectedStudent),
      getBookings({ studentId: selectedStudent, status: 'completed' }),
    ])
    setRecords(recs.data || [])
    setBookings(bkgs.data || [])
    setLoading(false)
  }, [selectedStudent])

  useEffect(() => { loadRecords() }, [loadRecords])

  // Group records by skill for display
  const grouped = SKILLS.reduce((acc, skill) => {
    const recs = records.filter(r => r.skill_name === skill)
    if (recs.length > 0) acc[skill] = recs
    return acc
  }, {})

  // Skill summary: what's the latest level for each skill
  const skillSummary = SKILLS.map(skill => {
    const recs = records.filter(r => r.skill_name === skill).sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded))
    return { skill, latest: recs[0] || null }
  })

  const proficientCount = skillSummary.filter(s => s.latest?.skill_level === 'proficient').length

  const openCreate = () => { setEditing(null); setForm({ ...defaultForm, booking_id: bookings[0]?.id || '' }); setShowModal(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({ booking_id: r.booking_id || '', skill_name: r.skill_name, skill_level: r.skill_level, instructor_feedback: r.instructor_feedback || '' })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setError('')
    const payload = {
      ...form,
      student_id: selectedStudent,
      instructor_id: profile.id,
      date_recorded: new Date().toISOString(),
    }
    let result
    if (editing) result = await updateProgressRecord(editing.id, payload)
    else result = await createProgressRecord(payload)
    if (result.error) { setError(result.error.message); return }
    setSuccess(editing ? 'Record updated.' : 'Progress record saved.')
    setShowModal(false)
    loadRecords()
  }

  const levelColor = { beginner: 'yellow', developing: 'blue', proficient: 'green' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{role === 'student' ? 'My Progress' : 'Progress Records'}</h1>
          <p className="text-sm text-gray-500 mt-1">Track driving skills across {SKILLS.length} competency areas</p>
        </div>
        {(role === 'instructor' || role === 'manager') && selectedStudent && (
          <Button onClick={openCreate}><Plus size={16} /> Add record</Button>
        )}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Student selector */}
      {role !== 'student' && (
        <Select label="Select student" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
          <option value="">Choose a student...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </Select>
      )}

      {!selectedStudent ? (
        <Card><EmptyState icon={BookOpen} title="Select a student" description="Choose a student above to view their progress records." /></Card>
      ) : loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Summary bar */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">Overall progress</h2>
              <span className="text-sm font-bold text-brand-600">{proficientCount}/{SKILLS.length} skills proficient</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${(proficientCount / SKILLS.length) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              {['beginner', 'developing', 'proficient'].map(l => (
                <span key={l} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full inline-block ${l === 'beginner' ? 'bg-yellow-400' : l === 'developing' ? 'bg-blue-400' : 'bg-green-400'}`} />
                  {skillSummary.filter(s => s.latest?.skill_level === l).length} {l}
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                {skillSummary.filter(s => !s.latest).length} not started
              </span>
            </div>
          </Card>

          {/* Skills grid */}
          <div className="grid gap-3">
            {SKILLS.map(skill => {
              const recs = grouped[skill] || []
              const latest = recs[0]
              const isExpanded = expanded[skill]
              return (
                <Card key={skill} padding={false}>
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
                    onClick={() => setExpanded(e => ({ ...e, [skill]: !e[skill] }))}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${latest?.skill_level === 'proficient' ? 'bg-green-400' : latest?.skill_level === 'developing' ? 'bg-blue-400' : latest?.skill_level === 'beginner' ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                      <span className="text-sm font-medium text-gray-900">{skill}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {latest ? <StatusBadge status={latest.skill_level} /> : <Badge color="gray">Not started</Badge>}
                      {recs.length > 0 && (isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />)}
                    </div>
                  </button>

                  {isExpanded && recs.length > 0 && (
                    <div className="border-t border-gray-50 px-4 pb-4">
                      <div className="space-y-3 mt-3">
                        {recs.map(r => (
                          <div key={r.id} className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{r.date_recorded ? format(parseISO(r.date_recorded), 'd MMM yyyy') : ''}</span>
                                <StatusBadge status={r.skill_level} />
                              </div>
                              {r.instructor_feedback && <p className="text-xs text-gray-600 mt-1 italic">"{r.instructor_feedback}"</p>}
                              {r.instructor && <p className="text-xs text-gray-400 mt-0.5">— {r.instructor.full_name}</p>}
                            </div>
                            {(role === 'instructor' || role === 'manager') && (
                              <button onClick={() => openEdit(r)} className="text-xs text-brand-600 hover:text-brand-800 shrink-0">Edit</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Add/Edit modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit progress record' : 'Add progress record'}>
        <div className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <Select label="Lesson (optional)" value={form.booking_id} onChange={e => setForm(f => ({ ...f, booking_id: e.target.value }))}>
            <option value="">No specific lesson</option>
            {bookings.map(b => (
              <option key={b.id} value={b.id}>{format(parseISO(b.lesson_datetime), 'EEE d MMM, h:mm a')}</option>
            ))}
          </Select>

          <Select label="Skill *" value={form.skill_name} onChange={e => setForm(f => ({ ...f, skill_name: e.target.value }))}>
            {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>

          <Select label="Level *" value={form.skill_level} onChange={e => setForm(f => ({ ...f, skill_level: e.target.value }))}>
            {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </Select>

          <Textarea label="Feedback" placeholder="Notes for the student about this skill..." value={form.instructor_feedback} onChange={e => setForm(f => ({ ...f, instructor_feedback: e.target.value }))} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Save changes' : 'Save record'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
