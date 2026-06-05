import React, { useEffect } from 'react'
import { SignUp } from '../clerk-bridge'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function SignupPage() {
  useEffect(() => {
    sessionStorage.setItem('is_signup_flow', 'true')
  }, [])

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(109,95,232,0.1)_0%,transparent_60%)]" />

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl">AI Interviewer</span>
        </div>

        <div className="flex justify-center">
          <SignUp
            routing="path"
            path="/signup"
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
                socialButtonsBlockButton: 'bg-dark-600 border border-white/10 text-white hover:bg-dark-500',
                formButtonPrimary: 'bg-primary-600 hover:bg-primary-700',
                footerActionLink: 'text-primary-400',
              }
            }}
            redirectUrl="/dashboard"
            signInUrl="/login"
          />
        </div>
      </div>
    </div>
  )
}
