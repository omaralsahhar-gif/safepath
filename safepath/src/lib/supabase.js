import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// AUTH
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// PROFILES
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

// BOOKINGS
export const getBookings = async (filters = {}) => {
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
  return { data, error }
}

export const createBooking = async (booking) => {
  const { data, error } = await supabase
    .from('bookings')
    .insert([booking])
    .select()
    .single()
  return { data, error }
}

export const updateBooking = async (id, updates) => {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteBooking = async (id) => {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  return { error }
}

// INSTRUCTORS
export const getInstructors = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'instructor')
    .eq('is_active', true)
    .order('full_name')
  return { data, error }
}

// STUDENTS
export const getStudents = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('full_name')
  return { data, error }
}

// PROGRESS RECORDS
export const getProgressRecords = async (studentId) => {
  const { data, error } = await supabase
    .from('progress_records')
    .select(`
      *,
      booking:bookings(lesson_datetime),
      instructor:profiles!progress_records_instructor_id_fkey(full_name)
    `)
    .eq('student_id', studentId)
    .order('date_recorded', { ascending: false })
  return { data, error }
}

export const createProgressRecord = async (record) => {
  const { data, error } = await supabase
    .from('progress_records')
    .insert([record])
    .select()
    .single()
  return { data, error }
}

export const updateProgressRecord = async (id, updates) => {
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
  let query = supabase
    .from('payments')
    .select(`
      *,
      booking:bookings(
        lesson_datetime,
        student:profiles!bookings_student_id_fkey(full_name),
        instructor:profiles!bookings_instructor_id_fkey(full_name)
      )
    `)
    .order('payment_date', { ascending: false })

  if (filters.studentId) {
    query = query.eq('booking.student_id', filters.studentId)
  }

  const { data, error } = await query
  return { data, error }
}

export const createPayment = async (payment) => {
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [students, instructors, bookingsThisWeek, recentPayments] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student').eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'instructor').eq('is_active', true),
    supabase.from('bookings').select('id', { count: 'exact' }).eq('status', 'confirmed').gte('lesson_datetime', today.toISOString()).lte('lesson_datetime', weekEnd.toISOString()),
    supabase.from('payments').select('amount').eq('status', 'paid').gte('payment_date', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())
  ])

  const monthRevenue = recentPayments.data?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0

  return {
    totalStudents: students.count || 0,
    totalInstructors: instructors.count || 0,
    bookingsThisWeek: bookingsThisWeek.count || 0,
    monthRevenue,
  }
}
