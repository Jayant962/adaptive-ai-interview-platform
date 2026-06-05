import React from 'react'
import { SignIn } from '../clerk-bridge'
import { Link, useLocation } from 'react-router-dom'
import { Zap, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const isExpired = queryParams.get('expired') === 'true'

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(109,95,232,0.1)_0%,transparent_60%)]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl">AI Interviewer</span>
        </div>

        {/* Expiration warning notice */}
        {isExpired && (
          <div className="mb-6 p-4 bg-amber-950/40 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-200 shadow-xl backdrop-blur-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-bold block text-white mb-0.5">Session Expired (48 Hours)</span>
              For your security, your session has expired. To continue, please sign in again.
              <span className="block mt-1.5 text-[11px] text-amber-300/70">
                Note: If signing in via Google/Gmail, please make sure to explicitly select your account to refresh credentials.
              </span>
            </div>
          </div>
        )}

        {/* Clerk SignIn Component */}
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            appearance={{
              variables: {
                colorPrimary: '#6d5fe8',
                colorBackground: 'var(--clerk-bg)',
                colorText: 'var(--clerk-text)',
                colorTextSecondary: 'var(--clerk-text-secondary)',
                colorInputBackground: 'var(--clerk-input-bg)',
                colorInputText: 'var(--clerk-input-text)',
                borderRadius: '0.75rem',
              },
              elements: {
                card: 'bg-dark-700 border border-white/10 shadow-2xl',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-400',
                socialButtonsBlockButton: 'bg-dark-600 border border-white/10 text-white hover:bg-dark-500',
                formFieldInput: 'bg-dark-600 border-white/10 text-white',
                formButtonPrimary: 'bg-primary-600 hover:bg-primary-700',
                footerActionLink: 'text-primary-400',
              }
            }}
            redirectUrl="/dashboard"
            signUpUrl="/signup"
          />
        </div>
      </div>
    </div>
  )
}
