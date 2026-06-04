import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain, Database, Code, Cpu, Network, Shield,
  Users, MessageSquare, BookOpen, Globe, ChevronRight,
  Edit3, Zap, BarChart2, Layers
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import { Card, Button, Badge } from '../components/ui'
import { useInterview } from '../context/InterviewContext'
import { useAuthContext } from '../context/AuthContext'
import { startInterview } from '../services/api'

// ─── Category Data ────────────────────────────────────────
const CATEGORIES = [
  {
    section: 'Technical',
    items: [
      { id: 'Data Science',        icon: BarChart2,    tag: 'Popular' },
      { id: 'Data Analytics',      icon: BarChart2,    tag: '' },
      { id: 'Machine Learning',    icon: Brain,        tag: 'Popular' },
      { id: 'Artificial Intelligence', icon: Cpu,      tag: 'Hot' },
      { id: 'Agentic AI',          icon: Zap,          tag: 'New' },
      { id: 'React',               icon: Code,         tag: 'Popular' },
      { id: 'JavaScript',          icon: Code,         tag: 'Popular' },
      { id: 'Python',              icon: Code,         tag: 'Popular' },
      { id: 'C',                   icon: Code,         tag: '' },
      { id: 'C++',                 icon: Code,         tag: '' },
      { id: 'Java',                icon: Code,         tag: '' },
      { id: 'DSA',                 icon: Layers,       tag: 'Hot' },
      { id: 'DBMS',                icon: Database,     tag: 'Popular' },
      { id: 'OOP',                 icon: Code,         tag: '' },
      { id: 'Operating Systems',   icon: Cpu,          tag: '' },
      { id: 'Computer Networks',   icon: Network,      tag: '' },
      { id: 'System Design',       icon: Layers,       tag: 'Popular' },
    ]
  },
  {
    section: 'Interview Prep',
    items: [
      { id: 'HR Interview',        icon: Users,        tag: '' },
      { id: 'Behavioral Interview',icon: MessageSquare,tag: '' },
      { id: 'Communication Skills',icon: MessageSquare,tag: '' },
      { id: 'English Speaking',    icon: MessageSquare,tag: '' },
    ]
  },
  {
    section: 'Academic',
    items: [
      { id: 'CSE',                 icon: Cpu,          tag: '' },
      { id: 'ECE',                 icon: Cpu,          tag: '' },
      { id: 'Mechanical Engineering', icon: Cpu,       tag: '' },
    ]
  },
  {
    section: 'General',
    items: [
      { id: 'General Knowledge',   icon: Globe,        tag: '' },
    ]
  },
]

const DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Easy',
    desc: '5 questions • 1 follow-up max • Foundational concepts',
    color: 'text-green-400',
    bg: 'bg-green-900/20',
    border: 'border-green-500/30',
    active: 'border-green-500 bg-green-900/30',
  },
  {
    id: 'medium',
    label: 'Medium',
    desc: '7 questions • 2 follow-ups max • Applied knowledge',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-500/30',
    active: 'border-yellow-500 bg-yellow-900/30',
  },
  {
    id: 'hard',
    label: 'Hard',
    desc: '8 questions • 3 follow-ups max • Deep technical analysis',
    color: 'text-red-400',
    bg: 'bg-red-900/20',
    border: 'border-red-500/30',
    active: 'border-red-500 bg-red-900/30',
  },
]

export default function SetupPage() {
  const navigate = useNavigate()
  const { getAuthToken } = useAuthContext()
  const { setSession, setQuestion, setPhase, INTERVIEW_PHASES } = useInterview()

  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium')
  const [customTopic, setCustomTopic] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const effectiveTopic = useCustom ? customTopic.trim() : selectedTopic
  const canStart = (useCustom ? customTopic.trim().length > 2 : selectedTopic) && selectedDifficulty

  const handleStart = async () => {
    if (!canStart) return
    setLoading(true)
    setError('')
    try {
      const token = await getAuthToken()
      const result = await startInterview(token, {
        topic: useCustom ? 'Custom' : selectedTopic,
        difficulty: selectedDifficulty,
        customTopic: useCustom ? customTopic.trim() : null,
      })
      // Store in context
      setSession({
        sessionId: result.session_id,
        topic: result.topic,
        difficulty: result.difficulty,
        totalQuestions: result.total_questions,
      })
      setQuestion({
        question: result.first_question,
        questionId: result.question_id,
        questionNumber: 1,
      })
      navigate('/interview/session')
    } catch (err) {
      setError(err.message || 'Failed to start interview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Setup Your Interview</h1>
          <p className="text-gray-400 text-sm mt-1">Choose a topic and difficulty to begin</p>
        </div>

        {/* Step 1: Topic */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-lg">Step 1: Select Topic</h2>
              <p className="text-gray-500 text-sm">Choose a predefined topic or enter a custom one</p>
            </div>
            <button
              onClick={() => { setUseCustom(!useCustom); setSelectedTopic('') }}
              className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 border border-primary-500/30 px-3 py-2 rounded-xl transition-colors"
            >
              <Edit3 size={14} />
              {useCustom ? 'Browse Topics' : 'Custom Topic'}
            </button>
          </div>

          {useCustom ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Enter any topic</label>
              <input
                type="text"
                placeholder="e.g. Cloud Security, Blockchain, Kubernetes..."
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                className="w-full bg-dark-600 border border-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
              <p className="text-gray-600 text-xs mt-2">The AI will generate relevant interview questions for your topic.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map(({ section, items }) => (
                <div key={section}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{section}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {items.map(({ id, icon: Icon, tag }) => {
                      const active = selectedTopic === id
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedTopic(id)}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-150 ${
                            active
                              ? 'bg-primary-600/20 border-primary-500 text-primary-300'
                              : 'bg-dark-600/50 border-white/8 text-gray-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <Icon size={20} />
                          <span className="text-xs font-medium leading-tight">{id}</span>
                          {tag && (
                            <span className="text-[10px] bg-primary-900/50 text-primary-300 px-1.5 py-0.5 rounded-full absolute -top-1 -right-1">
                              {tag}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Step 2: Difficulty */}
        <Card className="p-6">
          <h2 className="text-white font-bold text-lg mb-2">Step 2: Select Difficulty</h2>
          <p className="text-gray-500 text-sm mb-6">Affects question complexity and follow-up depth</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {DIFFICULTIES.map(({ id, label, desc, color, bg, border, active }) => {
              const isActive = selectedDifficulty === id
              return (
                <button
                  key={id}
                  onClick={() => setSelectedDifficulty(id)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-150 ${
                    isActive ? active : `${bg} ${border} hover:border-opacity-60`
                  }`}
                >
                  <p className={`text-lg font-black mb-1 ${color}`}>{label}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                  {isActive && (
                    <div className={`mt-3 w-6 h-1.5 ${bg.replace('20', '60')} rounded-full`} />
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Summary + Start */}
        {canStart && (
          <Card className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white font-bold text-lg">Ready to start?</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="primary">{effectiveTopic}</Badge>
                  <Badge variant={selectedDifficulty}>{selectedDifficulty}</Badge>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleStart}
                loading={loading}
                disabled={loading}
                className="min-w-[160px]"
              >
                Start Interview
                <ChevronRight size={18} />
              </Button>
            </div>
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
