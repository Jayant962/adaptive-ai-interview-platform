import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../clerk-bridge'
import {
  Zap, Brain, BarChart2, MessageSquare, Shield, Clock,
  ChevronDown, Star, ArrowRight, Play, Check, Mic,
  Target, TrendingUp, Award, Users
} from 'lucide-react'

// ─── Navbar ───────────────────────────────────────────────
function Navbar() {
  const { isSignedIn } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-dark-900/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">AI Interviewer</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#categories" className="hover:text-white transition-colors">Categories</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link to="/interview/setup">
                <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  Start Interview
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <button className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                    Sign In
                  </button>
                </Link>
                <Link to="/signup">
                  <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                    Get Started Free
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────
function Hero() {
  const { isSignedIn } = useUser()
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(109,95,232,0.15)_0%,transparent_60%)]" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div className="space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-500/20 text-primary-300 text-xs font-semibold px-4 py-2 rounded-full">
            <Zap size={12} />
            AI POWERED • ADAPTIVE • REAL-TIME
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            Your Personal{' '}
            <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
              AI Interview
            </span>
            {' '}Coach
          </h1>

          <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
            Practice unlimited interviews with adaptive AI that asks follow-up questions, evaluates your answers in real-time, and generates professional performance reports.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to={isSignedIn ? '/interview/setup' : '/signup'}>
              <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-primary-900/40 text-base">
                {isSignedIn ? 'Start Interview' : 'Get Started Free'}
                <ArrowRight size={18} />
              </button>
            </Link>
            <a href="#how-it-works">
              <button className="flex items-center gap-2 bg-dark-600/60 border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all text-base">
                <Play size={16} className="text-primary-400" />
                See How It Works
              </button>
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-6 pt-2">
            <div className="flex -space-x-2">
              {['A','B','C','D'].map((l,i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-primary-700 border-2 border-dark-900 flex items-center justify-center text-xs font-bold text-white">
                  {l}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {[...Array(5)].map((_,i) => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-xs text-gray-400">10K+ happy users</p>
            </div>
          </div>
        </div>

        {/* Right - Feature chips */}
        <div className="hidden lg:grid grid-cols-2 gap-4 animate-slide-up">
          {[
            { icon: Brain,      label: 'AI Powered Interviews',  desc: 'llama-3.3-70b model' },
            { icon: MessageSquare, label: 'Real-time Feedback',  desc: 'Instant evaluation' },
            { icon: Target,     label: 'Adaptive Questions',     desc: 'Smart follow-ups' },
            { icon: BarChart2,  label: 'Detailed Reports',       desc: 'Per-question scores' },
            { icon: Mic,        label: 'Voice Recognition',      desc: 'Browser speech API' },
            { icon: TrendingUp, label: 'Track Progress',         desc: 'Monthly analytics' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-dark-700/60 backdrop-blur-sm border border-white/8 rounded-2xl p-5 hover:border-primary-500/30 transition-all group">
              <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary-600/30 transition-colors">
                <Icon size={18} className="text-primary-400" />
              </div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: '10K+', label: 'Interviews Conducted' },
    { value: '95%',  label: 'User Satisfaction' },
    { value: '30+',  label: 'Topic Categories' },
    { value: '3',    label: 'Difficulty Levels' },
  ]
  return (
    <section className="py-16 bg-dark-800/50 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
        {stats.map(({ value, label }) => (
          <div key={label}>
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent mb-2">{value}</div>
            <div className="text-gray-400 text-sm">{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: Brain, title: 'Adaptive AI Interviewer',
      desc: 'Never the same interview twice. The AI analyzes your answers and generates intelligent follow-up questions to test your depth of understanding.',
      color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-500/20',
    },
    {
      icon: MessageSquare, title: 'Real-Time Evaluation',
      desc: 'Get instant technical scores from Groq AI and independent communication analysis from our NLP + ML pipeline.',
      color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20',
    },
    {
      icon: BarChart2, title: 'Professional Reports',
      desc: 'After every interview, receive a detailed PDF-style report with per-question scores, strengths, weaknesses, and improvement plans.',
      color: 'text-green-400', bg: 'bg-green-900/20 border-green-500/20',
    },
    {
      icon: Shield, title: 'Filler Word Detection',
      desc: 'Our NLP pipeline detects hesitation words like "um", "uh", "basically" and provides speaking improvement suggestions.',
      color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/20',
    },
    {
      icon: TrendingUp, title: 'Progress Tracking',
      desc: 'Track technical and communication growth over time. See your strongest topics, weakest areas, and monthly improvement charts.',
      color: 'text-red-400', bg: 'bg-red-900/20 border-red-500/20',
    },
    {
      icon: Award, title: 'Custom Topics',
      desc: 'Choose from 30+ predefined categories or enter any custom topic. The AI will generate relevant interview questions automatically.',
      color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-500/20',
    },
  ]

  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-primary-900/30 border border-primary-500/20 text-primary-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
          FEATURES
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Everything You Need to Ace Your Interview
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          A complete interview preparation system powered by state-of-the-art AI and custom NLP pipelines.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(({ icon: Icon, title, desc, color, bg }) => (
          <div key={title} className={`bg-dark-700/60 border ${bg.split(' ')[1]} rounded-2xl p-6 hover:scale-[1.02] transition-transform`}>
            <div className={`w-12 h-12 ${bg} border rounded-xl flex items-center justify-center mb-4`}>
              <Icon size={22} className={color} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Choose Topic & Difficulty', desc: 'Select from 30+ topics or enter a custom topic. Choose Easy, Medium, or Hard difficulty.' },
    { n: '02', title: 'AI Asks Questions', desc: 'The AI avatar speaks the question using voice synthesis. Answer verbally using your microphone.' },
    { n: '03', title: 'Adaptive Follow-Ups', desc: 'Based on your answer, the AI asks intelligent follow-up questions to test your depth of knowledge.' },
    { n: '04', title: 'Real-Time Evaluation', desc: 'Technical scores from Groq AI + Grammar, Fluency, Confidence scores from our NLP pipeline.' },
    { n: '05', title: 'Get Your Report', desc: 'Receive a professional report with scores for every question, strengths, weaknesses, and improvement plan.' },
  ]

  return (
    <section id="how-it-works" className="py-24 bg-dark-800/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">How It Works</h2>
          <p className="text-gray-400">Five simple steps to improve your interview performance</p>
        </div>
        <div className="space-y-6">
          {steps.map(({ n, title, desc }, i) => (
            <div key={n} className="flex gap-6 items-start">
              <div className="flex-none w-14 h-14 bg-primary-600/20 border border-primary-500/30 rounded-2xl flex items-center justify-center">
                <span className="text-primary-400 font-black text-lg">{n}</span>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="absolute left-7 mt-14 w-0.5 h-6 bg-primary-500/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Categories ───────────────────────────────────────────
function Categories() {
  const { isSignedIn } = useUser()
  const categories = [
    { name: 'Data Science', tag: 'Popular' },
    { name: 'Machine Learning', tag: 'Popular' },
    { name: 'System Design', tag: 'Popular' },
    { name: 'Python', tag: 'Popular' },
    { name: 'DSA', tag: 'Hot' },
    { name: 'DBMS', tag: '' },
    { name: 'HR Interview', tag: '' },
    { name: 'Behavioral', tag: '' },
    { name: 'OOP', tag: '' },
    { name: 'Computer Networks', tag: '' },
    { name: 'Operating Systems', tag: '' },
    { name: 'Custom Topic', tag: 'Any Topic' },
  ]

  return (
    <section id="categories" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">30+ Interview Categories</h2>
        <p className="text-gray-400">From technical to behavioral — we cover everything.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map(({ name, tag }) => (
          <Link to={isSignedIn ? '/interview/setup' : '/signup'} key={name}>
            <div className="bg-dark-700/60 border border-white/8 hover:border-primary-500/30 rounded-2xl p-5 text-center transition-all hover:scale-[1.02] group">
              <p className="text-white font-semibold text-sm group-hover:text-primary-300 transition-colors">{name}</p>
              {tag && (
                <span className="mt-2 inline-block text-xs bg-primary-900/40 text-primary-300 border border-primary-500/20 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null)
  const faqs = [
    { q: 'How does the adaptive follow-up system work?', a: 'After you answer a question, our AI analyzes your response for depth, completeness, and relevance. If your answer is vague or missing key concepts, it generates a targeted follow-up question to probe deeper.' },
    { q: 'How are scores calculated?', a: 'Technical scores (Technical Accuracy, Conceptual Understanding, Relevance) are evaluated by Groq AI. Communication scores (Grammar, Fluency, Confidence) are independently computed by our NLP + Scikit-Learn ML pipeline.' },
    { q: 'Does it work on mobile?', a: 'Yes! The platform is fully responsive and works on Android phones, tablets, and desktop browsers. The interview page adapts to smaller screens.' },
    { q: 'What topics can I practice?', a: 'We offer 30+ predefined categories including Data Science, ML, System Design, DSA, HR, and more. You can also enter any custom topic and our AI will generate relevant questions.' },
    { q: 'How many follow-up questions are asked?', a: 'Easy difficulty: max 1 follow-up. Medium: max 2 follow-ups. Hard: max 3 follow-ups per main question. Follow-ups are only generated if your answer needs deeper exploration.' },
  ]
  return (
    <section id="faq" className="py-24 max-w-3xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-3">
        {faqs.map(({ q, a }, i) => (
          <div key={i} className="bg-dark-700/60 border border-white/8 rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-5 text-left"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="text-white font-semibold text-sm">{q}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform flex-none ml-4 ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="px-6 pb-5">
                <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────
function CTA() {
  const { isSignedIn } = useUser()
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 to-transparent" />
      <div className="relative max-w-3xl mx-auto text-center px-4">
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">
          Ready to Ace Your Next Interview?
        </h2>
        <p className="text-gray-400 text-lg mb-10">
          Join thousands of students and professionals who are preparing smarter with AI-powered mock interviews.
        </p>
        <Link to={isSignedIn ? '/interview/setup' : '/signup'}>
          <button className="inline-flex items-center gap-3 bg-primary-600 hover:bg-primary-700 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-2xl shadow-primary-900/50">
            {isSignedIn ? 'Start Interview Now' : 'Start Practicing Free'}
            <ArrowRight size={20} />
          </button>
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="text-white font-bold">AI Interviewer</span>
        </div>
        <p className="text-gray-500 text-sm">© 2024 AI Interviewer. Built for students, by students.</p>
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="bg-dark-900 text-white min-h-screen">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Categories />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}
