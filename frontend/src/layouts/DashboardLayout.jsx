import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '../clerk-bridge'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Mic, FileText, History,
  User, LogOut, Settings, Menu, X, Zap, Moon, Sun
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  { path: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/interview/setup',   icon: Mic,             label: 'Interviews' },
  { path: '/reports',           icon: FileText,        label: 'Reports',   },
  { path: '/history',           icon: History,         label: 'History'    },
  { path: '/profile',           icon: User,            label: 'Profile'    },
]

export default function DashboardLayout({ children }) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { isDark, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 bg-dark-800 border-r border-white/5 transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">AI Interviewer</span>
          <button className="ml-auto lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-dark-600'
                )}
              >
                <Icon size={18} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 bg-primary-400 rounded-full" />}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <img
              src={user?.imageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}&background=4e38b9&color=fff`}
              alt={user?.fullName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-500/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-4 border-b border-white/5 bg-dark-800/50 backdrop-blur-sm">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold text-white">
              {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-xl bg-dark-600 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link to="/interview/setup">
              <button className="hidden sm:flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Mic size={15} />
                New Interview
              </button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
