import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signOut } from '../lib/supabase'
import {
  LayoutDashboard, Calendar, Users, BookOpen,
  CreditCard, LogOut, Menu, X, Car, ChevronRight
} from 'lucide-react'

const navByRole = {
  manager: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/bookings', icon: Calendar, label: 'Bookings' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/instructors', icon: Car, label: 'Instructors' },
    { to: '/progress', icon: BookOpen, label: 'Progress' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
  ],
  instructor: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/bookings', icon: Calendar, label: 'My Schedule' },
    { to: '/students', icon: Users, label: 'My Students' },
    { to: '/progress', icon: BookOpen, label: 'Progress Records' },
  ],
  student: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/bookings', icon: Calendar, label: 'My Lessons' },
    { to: '/progress', icon: BookOpen, label: 'My Progress' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
  ],
}

export default function Sidebar() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const role = profile?.role || 'student'
  const navItems = navByRole[role] || navByRole.student

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Car size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">SafePath</p>
          <p className="text-xs text-gray-400">Driving School</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                <span>{label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 min-h-screen fixed top-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Car size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">SafePath</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
