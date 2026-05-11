import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getDashboardStats, getBookings, getProgressRecords } from '../lib/supabase'
import { StatCard, Card, StatusBadge, EmptyState, Spinner } from '../components/UI'
import { Users, Car, Calendar, DollarSign, Clock } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function formatDate(datetime) {
  const d = parseISO(datetime)
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`
  if (isTomorrow(d)) return `Tomorrow at ${format(d, 'h:mm a')}`
  return format(d, 'EEE d MMM, h:mm a')
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)

  const role = profile?.role
  const name = profile?.full_name?.split(' ')[0] || 'there'

  useEffect(() => {
    // Safety timeout — never spin forever
    const timeout = setTimeout(() => setLoading(false), 6000)

    async function load() {
      try {
        const now = new Date().toISOString()
        const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString()
        const filters = { from: now, to: weekAhead, status: 'confirmed' }

        if (role === 'manager') {
          const [s, b] = await Promise.all([
            getDashboardStats(),
            getBookings(filters)
          ])
          setStats(s)
          setUpcoming(b.data || [])
        } else if (role === 'instructor') {
          const b = await getBookings({ ...filters, instructorId: profile.id })
          setUpcoming(b.data || [])
        } else {
          const [b, p] = await Promise.all([
            getBookings({ ...filters, studentId: profile.id }),
            getProgressRecords(profile.id)
          ])
          setUpcoming(b.data || [])
          const counts = { Beginner: 0, Developing: 0, Proficient: 0 }
          p.data?.forEach(r => { if (counts[r.skill_level] !== undefined) counts[r.skill_level]++ })
          setProgressData(Object.entries(counts).map(([name, value]) => ({ name, value })))
        }
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    }

    if (profile) {
      load()
    } else {
      // No profile yet — wait a moment then stop loading
      const fallback = setTimeout(() => setLoading(false), 3000)
      return () => { clearTimeout(timeout); clearTimeout(fallback) }
    }

    return () => clearTimeout(timeout)
  }, [profile, role])

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {getTimeOfDay()}, {name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Manager stats */}
      {role === 'manager' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active students" value={stats.totalStudents} icon={Users} color="blue" />
          <StatCard label="Instructors" value={stats.totalInstructors} icon={Car} color="purple" />
          <StatCard label="Lessons this week" value={stats.bookingsThisWeek} icon={Calendar} color="green" />
          <StatCard label="Revenue this month" value={`$${stats.monthRevenue.toLocaleString()}`} icon={DollarSign} color="orange" />
        </div>
      )}

      {/* Instructor stats */}
      {role === 'instructor' && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Lessons this week" value={upcoming.length} icon={Calendar} color="blue" sub="upcoming confirmed" />
          <StatCard label="Students today" value={upcoming.filter(b => isToday(parseISO(b.lesson_datetime))).length} icon={Users} color="green" sub="scheduled today" />
        </div>
      )}

      {/* Student progress chart */}
      {role === 'student' && progressData.some(d => d.value > 0) && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">My skill progress</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={progressData} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Upcoming lessons */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {role === 'manager' ? 'All upcoming lessons (next 7 days)' : 'My upcoming lessons'}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{upcoming.length} lesson{upcoming.length !== 1 ? 's' : ''}</span>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState icon={Calendar} title="No upcoming lessons" description="No confirmed lessons in the next 7 days." />
        ) : (
          <div className="space-y-3">
            {upcoming.map(booking => (
              <div key={booking.id} className="flex items-start justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 bg-brand-50 rounded-lg">
                    <Clock size={14} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(booking.lesson_datetime)}</p>
                    {role !== 'student' && booking.student && (
                      <p className="text-xs text-gray-500 mt-0.5">Student: {booking.student.full_name}</p>
                    )}
                    {role === 'student' && booking.instructor && (
                      <p className="text-xs text-gray-500 mt-0.5">Instructor: {booking.instructor.full_name}</p>
                    )}
                    {booking.location && (
                      <p className="text-xs text-gray-400 mt-0.5">{booking.location}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={booking.status} />
                  <span className="text-xs text-gray-400">{booking.duration_minutes} min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
