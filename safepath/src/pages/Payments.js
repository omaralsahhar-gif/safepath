import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPayments, createPayment, getBookings, supabase } from '../lib/supabase'
import { Button, Card, Modal, Input, Select, Alert, EmptyState, Spinner, StatusBadge, StatCard } from '../components/UI'
import { Plus, CreditCard, Search, DollarSign, TrendingUp, CheckCircle } from 'lucide-react'
import { format, parseISO, startOfMonth } from 'date-fns'

const METHODS = ['cash', 'card', 'bank transfer', 'other']

export default function Payments() {
  const { profile } = useAuth()
  const role = profile?.role
  const [payments, setPayments] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultForm = { booking_id: '', amount: '', method: 'cash', status: 'paid', notes: '' }
  const [form, setForm] = useState(defaultForm)

  const load = useCallback(async () => {
    setLoading(true)
    const filters = role === 'student' ? { studentId: profile.id } : {}
    const [p, b] = await Promise.all([
      getPayments(filters),
      getBookings(role === 'student' ? { studentId: profile.id } : {}),
    ])
    setPayments(p.data || [])
    setBookings(b.data?.filter(b => b.status === 'completed' || b.status === 'confirmed') || [])
    setLoading(false)
  }, [role, profile?.id])

  useEffect(() => { load() }, [load])

  const monthRevenue = payments
    .filter(p => p.status === 'paid' && p.payment_date && new Date(p.payment_date) >= startOfMonth(new Date()))
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length

  const handleSubmit = async () => {
    setError('')
    if (!form.booking_id || !form.amount) { setError('Booking and amount are required.'); return }
    const result = await createPayment({
      ...form,
      amount: parseFloat(form.amount),
      payment_date: new Date().toISOString(),
    })
    if (result.error) { setError(result.error.message); return }
    setSuccess('Payment recorded.')
    setShowModal(false)
    load()
  }

  const markPaid = async (id) => {
    await supabase.from('payments').update({ status: 'paid', payment_date: new Date().toISOString() }).eq('id', id)
    setSuccess('Payment marked as paid.')
    load()
  }

  const filtered = payments.filter(p => {
    const matchStatus = !statusFilter || p.status === statusFilter
    const matchSearch = !search || (
      p.booking?.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.method?.toLowerCase().includes(search.toLowerCase())
    )
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{payments.length} payment record{payments.length !== 1 ? 's' : ''}</p>
        </div>
        {role === 'manager' && <Button onClick={() => { setForm(defaultForm); setShowModal(true) }}><Plus size={16} /> Record payment</Button>}
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Stats */}
      {role === 'manager' && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="This month" value={`$${monthRevenue.toLocaleString()}`} icon={TrendingUp} color="green" />
          <StatCard label="Total received" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} color="blue" />
          <StatCard label="Unpaid invoices" value={unpaidCount} icon={CreditCard} color="orange" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {role !== 'student' && (
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Search by student name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState icon={CreditCard} title="No payments found" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 font-medium">
                  <th className="text-left px-4 py-3">Date</th>
                  {role !== 'student' && <th className="text-left px-4 py-3">Student</th>}
                  <th className="text-left px-4 py-3">Lesson</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  {role === 'manager' && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">
                      {p.payment_date ? format(parseISO(p.payment_date), 'd MMM yyyy') : '—'}
                    </td>
                    {role !== 'student' && <td className="px-4 py-3 text-gray-700">{p.booking?.student?.full_name || '—'}</td>}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.booking?.lesson_datetime ? format(parseISO(p.booking.lesson_datetime), 'd MMM, h:mm a') : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">${parseFloat(p.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{p.method || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    {role === 'manager' && (
                      <td className="px-4 py-3">
                        {p.status === 'unpaid' && (
                          <button onClick={() => markPaid(p.id)} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                            <CheckCircle size={12} /> Mark paid
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record payment modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record payment">
        <div className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          <Select label="Lesson *" value={form.booking_id} onChange={e => setForm(f => ({ ...f, booking_id: e.target.value }))}>
            <option value="">Select a booking</option>
            {bookings.map(b => (
              <option key={b.id} value={b.id}>
                {b.student?.full_name} — {b.lesson_datetime ? format(parseISO(b.lesson_datetime), 'd MMM, h:mm a') : '?'}
              </option>
            ))}
          </Select>
          <Input label="Amount ($) *" type="number" step="0.01" min="0" placeholder="75.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Select label="Payment method" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
            {METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid (invoice)</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
