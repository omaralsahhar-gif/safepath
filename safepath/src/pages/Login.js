import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import { Button, Input, Alert } from '../components/UI'
import { Car } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Car size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SafePath</h1>
          <p className="text-gray-500 text-sm mt-1">Driving School Management</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Alert type="error" message={error} onClose={() => setError('')} />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Contact your school administrator to get access.
            </p>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-4 bg-white/60 rounded-xl border border-gray-100 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600 mb-2">Demo accounts:</p>
          <p>Manager: manager@safepath.com.au</p>
          <p>Instructor: instructor@safepath.com.au</p>
          <p>Student: student@safepath.com.au</p>
          <p className="mt-1 text-gray-400">Password: SafePath2026!</p>
        </div>
      </div>
    </div>
  )
}
