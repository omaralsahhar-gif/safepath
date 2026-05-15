import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: { 'x-application-name': 'safepath' }
  }
})

// Simple in-memory cache — prevents re-fetching same data within 30 seconds
const cache = {}
const CACHE_TTL = 30000 // 30 seconds

function getCached(key) {
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.time > CACHE_TTL) { delete cache[key]; return null }
  return entry.data
}

function setCached(key, data) {
  cache[key] = { data, time: Date.now() }
}

export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k])
}

// AUTH
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = async () => {
  clearCache()
  return supabase.auth.signOut()
}

export const getSession = () => supabase.auth.getSession()

// PROFILES
export const getProfile = async (userId) => {
  const key = `profile_${userId}`
  const cached = getCached(key)
  if (cached) return { data: cached, error: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (data) setCached(key, data)
  return { data, error }
}

// BOOKINGS
export const getBookings = async (filters = {}) => {
  const key = `bookings_${JSON.stringify(filters)}`
  const cached = getCached(key)
  if (cached) return { data: cached, error: null }

  let query = supabase
    .from('bookings')
    .select(`
      *,
      student:profiles!bookings_student_id_fkey(id, full_name, email, phone),
      instructor:profiles!bookings_instructor_id_fkey(id, full_name, email)
    `)
    .order('lesson_datetime', { ascending: true })

  if (filters.studentId) query = query.eq('student_id', filters.studentId)
  if (filters.instructorId) query = query.eq('instructor_id', filters.instructorId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('lesson_datetime', filters.from)
  if (filters.to) query = query.lte('lesson_datetime', filters.to)

  const { data, error } = await query
  if (data) setCached(key, data)
  return { data, error }
}

export const createBooking = async (booking) => {
  clearCache()
  const { data, error } = await supabase
    .from('bookings')
    .insert([booking])
    .select()
    .single()
  return { data, error }
}

export const updateBooking = async (id, updates) => {
  clearCache()
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteBooking = async (id) => {
  clearCache()
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  return { error }
}

// INSTRUCTORS
export const getInstructors = async () => {
  const cached = getCached('instructors')
  if (cached) return { data: cached, error: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'instructor')
    .eq('is_active', true)
    .order('full_name')

  if (data) setCached('instructors', data)
  return { data, error }
}

// STUDENTS
export const getStudents = async () => {
  const cached = getCached('students')
  if (cached) return { data: cached, error: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('full_name')

  if (data) setCached('students', data)
  return { data, error }
}

// PROGRESS RECORDS
export const getProgressRecords = async (studentId) => {
  const key = `progress_${studentId}`
  const cached = getCached(key)
  if (cached) return { data: cached, error: null }

  const { data, error } = await supabase
    .from('progress_records')
    .select(`
      *,
      booking:bookings(lesson_datetime),
      instructor:profiles!progress_records_instructor_id_fkey(full_name)
    `)
    .eq('student_id', studentId)
    .order('date_recorded', { ascending: false })

  if (data) setCached(key, data)
  return { data, error }
}

export const createProgressRecord = async (record) => {
  clearCache()
  const { data, error } = await supabase
    .from('progress_records')
    .insert([record])
    .select()
    .single()
  return { data, error }
}

export const updateProgressRecord = async (id, updates) => {
  clearCache()
  const { data, error } = await supabase
    .from('progress_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// PAYMENTS
export const getPayments = async (filters = {}) => {
  const key = `payments_${JSON.stringify(filters)}`
  const cached = getCached(key)
  if (cached) return { data: cached, error: null }

  let query = supabase
    .from('payments')
    .select(`
      *,
      booking:bookings(
        lesson_datetime,
        student_id,
        student:profiles!bookings_student_id_fkey(full_name),
        instructor:profiles!bookings_instructor_id_fkey(full_name)
      )
    `)
    .order('payment_date', { ascending: false })

  const { data, error } = await query
  if (data) setCached(key, data)
  return { data, error }
}

export const createPayment = async (payment) => {
  clearCache()
  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single()
  return { data, error }
}

// CHECK INSTRUCTOR AVAILABILITY
export const checkAvailability = async (instructorId, datetime, durationMins = 60) => {
  const start = new Date(datetime)
  const end = new Date(start.getTime() + durationMins * 60000)

  const { data, error } = await supabase
    .from('bookings')
    .select('id, lesson_datetime, duration_minutes')
    .eq('instructor_id', instructorId)
    .eq('status', 'confirmed')
    .gte('lesson_datetime', start.toISOString())
    .lte('lesson_datetime', end.toISOString())

  return { available: !error && data.length === 0, error }
}

// DASHBOARD STATS
export const getDashboardStats = async () => {
  const cached = getCached('dashboard_stats')
  if (cached) return cached

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [students, instructors, bookingsThisWeek, recentPayments] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'instructor').eq('is_active', true),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('lesson_datetime', today.toISOString()).lte('lesson_datetime', weekEnd.toISOString()),
    supabase.from('payments').select('amount').eq('status', 'paid').gte('payment_date', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())
  ])

  const monthRevenue = recentPayments.data?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0

  const result = {
    totalStudents: students.count || 0,
    totalInstructors: instructors.count || 0,
    bookingsThisWeek: bookingsThisWeek.count || 0,
    monthRevenue,
  }

  setCached('dashboard_stats', result)
  return result
}
