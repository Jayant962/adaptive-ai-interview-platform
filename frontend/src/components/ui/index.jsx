import React from 'react'
import { clsx } from 'clsx'

// ─── Button ───────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900'

  const variants = {
    primary:   'bg-primary-600 hover:bg-primary-700 text-rawWhite focus:ring-primary-500 shadow-lg shadow-primary-900/30',
    secondary: 'bg-dark-500 hover:bg-dark-400 text-white border border-white/10 focus:ring-white/20',
    danger:    'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 focus:ring-red-500',
    ghost:     'text-gray-300 hover:text-white hover:bg-white/5 focus:ring-white/20',
    success:   'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 focus:ring-green-500',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────
export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'bg-dark-700/80 backdrop-blur-sm border border-white/10 rounded-2xl',
        hover && 'hover:border-primary-500/30 hover:bg-dark-600/80 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default:  'bg-dark-500 text-gray-300 border-white/10',
    primary:  'bg-primary-900/50 text-primary-300 border-primary-500/30',
    success:  'bg-green-900/30 text-green-400 border-green-500/30',
    warning:  'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
    danger:   'bg-red-900/30 text-red-400 border-red-500/30',
    easy:     'bg-green-900/30 text-green-400 border-green-500/30',
    medium:   'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
    hard:     'bg-red-900/30 text-red-400 border-red-500/30',
  }
  return (
    <span className={clsx(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
      variants[variant] || variants.default,
      className
    )}>
      {children}
    </span>
  )
}

// ─── Spinner ─────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={clsx(
      'border-4 border-primary-600 border-t-transparent rounded-full animate-spin',
      sizes[size],
      className
    )} />
  )
}

// ─── ScoreRing ────────────────────────────────────────────
export function ScoreRing({ score = 0, size = 120, label = '' }) {
  const radius = (size / 2) - 10
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  const color =
    score >= 80 ? '#4ade80' :
    score >= 65 ? '#60a5fa' :
    score >= 50 ? '#facc15' : '#f87171'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgb(var(--color-dark-600))" strokeWidth="8"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
        <text
          x={size / 2} y={size / 2} textAnchor="middle"
          dominantBaseline="central"
          fill={color} fontSize={size * 0.22} fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {Math.round(score)}
        </text>
      </svg>
      {label && <span className="text-xs text-gray-400 font-medium">{label}</span>}
    </div>
  )
}

// ─── ScoreBar ─────────────────────────────────────────────
export function ScoreBar({ label, score, maxScore = 100, color = 'primary' }) {
  const pct = Math.min(100, (score / maxScore) * 100)
  const colors = {
    primary: 'bg-primary-500',
    green:   'bg-green-500',
    blue:    'bg-blue-500',
    yellow:  'bg-yellow-500',
    red:     'bg-red-500',
  }
  const textColors = {
    primary: 'text-primary-400',
    green:   'text-green-400',
    blue:    'text-blue-400',
    yellow:  'text-yellow-400',
    red:     'text-red-400',
  }
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-300">{label}</span>
        <span className={clsx('text-sm font-bold', textColors[color])}>{Math.round(score)}</span>
      </div>
      <div className="h-2 bg-dark-500 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-1000', colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-gray-600 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

// ─── PageLoader ───────────────────────────────────────────
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-gray-400 text-sm animate-pulse">{message}</p>
    </div>
  )
}

// ─── SectionHeader ───────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
