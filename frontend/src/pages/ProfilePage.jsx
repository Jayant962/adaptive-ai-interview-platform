import React, { useState } from 'react'
import { useUser, useClerk } from '../clerk-bridge'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Calendar, Edit3, LogOut, Shield, Mic } from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import { Card, Badge } from '../components/ui'
import { useAuthContext } from '../context/AuthContext'
export default function ProfilePage() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { dbUser, getAuthToken } = useAuthContext()
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  
  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const joinDate = dbUser?.registration_date
    ? new Date(dbUser.registration_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A'

  const lastLogin = dbUser?.last_login
    ? new Date(dbUser.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A'

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Profile</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <Card className="p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user?.imageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}&size=80&background=4e38b9&color=fff`}
                alt={user?.fullName}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary-500/20"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-dark-700" />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-white">{user?.fullName || 'User'}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
              <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start flex-wrap">
                <Badge variant="primary">
                  <Shield size={10} className="mr-1" />
                  Verified Account
                </Badge>
                {user?.primaryEmailAddress?.verification?.status === 'verified' && (
                  <Badge variant="success">Email Verified</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card className="p-6">
          <h3 className="text-white font-bold mb-5 flex items-center gap-2">
            <User size={16} className="text-primary-400" /> Account Information
          </h3>
          <div className="space-y-4">
            <InfoRow icon={User} label="Full Name" value={user?.fullName || 'N/A'} />
            <InfoRow icon={Mail} label="Email Address" value={user?.primaryEmailAddress?.emailAddress || 'N/A'} />
            <InfoRow icon={Calendar} label="Member Since" value={joinDate} />
            <InfoRow icon={Calendar} label="Last Active" value={lastLogin} />
          </div>
        </Card>

        {/* Quick Links */}
        <Card className="p-6">
          <h3 className="text-white font-bold mb-4">Quick Actions</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link to="/interview/setup">
              <button className="w-full flex items-center gap-3 p-4 bg-primary-600/10 border border-primary-500/20 rounded-xl hover:bg-primary-600/20 transition-colors text-left">
                <Mic size={16} className="text-primary-400" />
                <div>
                  <p className="text-white text-sm font-semibold">New Interview</p>
                  <p className="text-gray-500 text-xs">Start practicing now</p>
                </div>
              </button>
            </Link>
            <Link to="/history">
              <button className="w-full flex items-center gap-3 p-4 bg-dark-600/60 border border-white/8 rounded-xl hover:bg-dark-600 transition-colors text-left">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <p className="text-white text-sm font-semibold">View History</p>
                  <p className="text-gray-500 text-xs">All past interviews</p>
                </div>
              </button>
            </Link>
          </div>
        </Card>

        {/* Account Actions */}
        <Card className="p-6">
          <h3 className="text-white font-bold mb-4">Account Actions</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="flex items-center justify-center gap-3 px-5 py-3 bg-red-900/20 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-900/30 transition-colors text-sm font-semibold"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </Card>
      </div>

      {/* Sign out confirm modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="p-8 max-w-sm w-full text-center">
            <p className="text-white font-bold text-lg mb-2">Sign Out?</p>
            <p className="text-gray-400 text-sm mb-6">You'll need to sign in again to access your interviews.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="px-5 py-2.5 bg-dark-600 border border-white/10 text-white rounded-xl text-sm font-semibold hover:bg-dark-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center flex-none">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-white text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}
