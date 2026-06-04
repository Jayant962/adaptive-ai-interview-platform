import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../clerk-bridge'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, CartesianGrid, Legend
} from 'recharts'
import {
  Mic, TrendingUp, Award, Clock, ArrowRight,
  BarChart2, Target, ChevronRight, Zap
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import { Card, Badge, ScoreRing, EmptyState, PageLoader } from '../components/ui'
import { getAnalytics } from '../services/api'
import { useAuthContext } from '../context/AuthContext'

function StatCard({ label, value, sub, color = 'text-white', icon: Icon }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center">
          <Icon size={18} className="text-primary-400" />
        </div>
      </div>
      <p className={`text-3xl font-black mb-1 ${color}`}>{value ?? '—'}</p>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </Card>
  )
}

function DifficultyBadge({ d }) {
  const map = { easy: 'easy', medium: 'medium', hard: 'hard' }
  return <Badge variant={map[d?.toLowerCase()] || 'default'}>{d}</Badge>
}

const COLORS = {
  technical: '#7f77dd',
  communication: '#22c55e',
}

export default function DashboardPage() {
  const { user } = useUser()
  const { getAuthToken } = useAuthContext()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAuthToken()
        const data = await getAnalytics(token)
        setAnalytics(data)
      } catch (err) {
        console.error('Analytics load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  const recentSessions = analytics?.recent_sessions || []
  const techGrowth = analytics?.technical_growth?.slice(-8) || []
  const commGrowth = analytics?.communication_growth?.slice(-8) || []

  // Merge tech and comm growth for chart
  const growthData = techGrowth.map((item, i) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Technical: Math.round(item.score),
    Communication: commGrowth[i] ? Math.round(commGrowth[i].score) : null,
  }))

  // Topic performance data
  const topicData = recentSessions.reduce((acc, s) => {
    if (!s.topic || !s.overall_score) return acc
    const existing = acc.find(a => a.topic === s.topic)
    if (existing) {
      existing.scores.push(s.overall_score)
    } else {
      acc.push({ topic: s.topic, scores: [s.overall_score] })
    }
    return acc
  }, []).map(t => ({
    topic: t.topic.length > 12 ? t.topic.substring(0, 12) + '...' : t.topic,
    score: Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length),
  })).slice(0, 6)

  const firstName = user?.firstName || 'there'
  const hasData = analytics?.total_interviews > 0

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {hasData
                ? 'Keep practicing and improve your skills.'
                : 'Start your first interview to see your progress here.'}
            </p>
          </div>
          <Link to="/interview/setup">
            <button className="hidden sm:flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors">
              <Mic size={16} />
              New Interview
            </button>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Mic}       label="Total Interviews" value={analytics?.total_interviews || 0} color="text-primary-400" />
          <StatCard icon={BarChart2} label="Average Score"    value={analytics?.avg_score ? `${analytics.avg_score}` : '—'} sub="out of 100" color="text-blue-400" />
          <StatCard icon={Award}     label="Best Score"       value={analytics?.best_score ? `${analytics.best_score}` : '—'} sub="personal best" color="text-green-400" />
          <StatCard icon={Clock}     label="Time Practiced"
            value={analytics?.total_time_spent
              ? `${Math.round(analytics.total_time_spent / 3600)}h ${Math.round((analytics.total_time_spent % 3600) / 60)}m`
              : '0m'}
            color="text-yellow-400" />
        </div>

        {!hasData ? (
          <Card className="p-16">
            <EmptyState
              icon={<Zap size={48} />}
              title="No interviews yet"
              description="Take your first AI mock interview to start tracking your progress and getting personalized feedback."
              action={
                <Link to="/interview/setup">
                  <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                    Start First Interview
                    <ArrowRight size={16} />
                  </button>
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Progress Chart */}
              <Card className="p-6">
                <h3 className="text-white font-bold mb-1">Performance Overview</h3>
                <p className="text-gray-500 text-xs mb-6">Technical vs Communication scores over time</p>
                {growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#22222f" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#16161f', border: '1px solid #353550', borderRadius: '8px', color: '#e2e8f0' }}
                      />
                      <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                      <Line type="monotone" dataKey="Technical" stroke={COLORS.technical} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Communication" stroke={COLORS.communication} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
                    Complete more interviews to see your progress chart
                  </div>
                )}
              </Card>

              {/* Topic Performance */}
              <Card className="p-6">
                <h3 className="text-white font-bold mb-1">Topic Performance</h3>
                <p className="text-gray-500 text-xs mb-6">Average score by topic</p>
                {topicData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topicData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#22222f" />
                      <XAxis dataKey="topic" tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#16161f', border: '1px solid #353550', borderRadius: '8px', color: '#e2e8f0' }}
                      />
                      <Bar dataKey="score" fill="#6d5fe8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
                    Practice different topics to see performance breakdown
                  </div>
                )}
              </Card>
            </div>

            {/* Strong / Weak Areas + Recent */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Strong & Weak */}
              <Card className="p-6 space-y-6">
                <div>
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-400" /> Strong Areas
                  </h4>
                  {analytics?.strongest_topics?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {analytics.strongest_topics.map(t => (
                        <Badge key={t} variant="success">{t}</Badge>
                      ))}
                    </div>
                  ) : <p className="text-gray-600 text-sm">No data yet</p>}
                </div>
                <div>
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Target size={16} className="text-red-400" /> Weak Areas
                  </h4>
                  {analytics?.weakest_topics?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {analytics.weakest_topics.map(t => (
                        <Badge key={t} variant="danger">{t}</Badge>
                      ))}
                    </div>
                  ) : <p className="text-gray-600 text-sm">No data yet</p>}
                </div>
              </Card>

              {/* Recent Interviews */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold">Recent Interviews</h3>
                    <Link to="/history" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                      View All <ChevronRight size={14} />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentSessions.slice(0, 4).map(s => (
                      <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-dark-600/50 hover:bg-dark-600 transition-colors">
                        <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center flex-none">
                          <Mic size={16} className="text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{s.topic}</p>
                          <p className="text-gray-500 text-xs">
                            {new Date(s.date).toLocaleDateString()} • <DifficultyBadge d={s.difficulty} />
                          </p>
                        </div>
                        <div className="text-right flex-none">
                          <span className={`text-lg font-black ${
                            s.overall_score >= 80 ? 'text-green-400' :
                            s.overall_score >= 60 ? 'text-blue-400' : 'text-yellow-400'
                          }`}>
                            {s.overall_score ? Math.round(s.overall_score) : '—'}
                          </span>
                        </div>
                        <Link to={`/reports/${s.id}`}>
                          <button className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-dark-500 transition-colors">
                            <ChevronRight size={14} />
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
