import React from 'react'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'

export const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, className = '', type = 'button' }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-brand-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

export const Card = ({ children, className = '', padding = true }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
    {children}
  </div>
)

export const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

export const StatusBadge = ({ status }) => {
  const map = {
    confirmed: { label: 'Confirmed', color: 'green' },
    cancelled: { label: 'Cancelled', color: 'red' },
    completed: { label: 'Completed', color: 'blue' },
    pending: { label: 'Pending', color: 'yellow' },
    paid: { label: 'Paid', color: 'green' },
    unpaid: { label: 'Unpaid', color: 'red' },
    beginner: { label: 'Beginner', color: 'yellow' },
    developing: { label: 'Developing', color: 'blue' },
    proficient: { label: 'Proficient', color: 'green' },
  }
  const s = map[status] || { label: status, color: 'gray' }
  return <Badge color={s.color}>{s.label}</Badge>
}

export const Input = ({ label, error, className = '', ...props }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)

export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white transition-all ${error ? 'border-red-400' : 'border-gray-300'}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)

export const Textarea = ({ label, error, className = '', ...props }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea
      rows={3}
      className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none transition-all ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)

export const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null
  const styles = {
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', Icon: Info },
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', Icon: CheckCircle },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', Icon: AlertCircle },
  }
  const { bg, text, Icon } = styles[type]
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${bg} ${text}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      {onClose && <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>}
    </div>
  )
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export const StatCard = ({ label, value, sub, icon: Icon, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${colors[color]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </Card>
  )
}

export const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} border-2 border-gray-200 border-t-brand-600 rounded-full animate-spin`} />
  )
}

export const LoadingPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
)

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {Icon && <div className="p-4 bg-gray-50 rounded-full mb-4"><Icon size={28} className="text-gray-400" /></div>}
    <h3 className="text-base font-medium text-gray-900">{title}</h3>
    {description && <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)
