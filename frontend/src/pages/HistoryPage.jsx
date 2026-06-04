import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, Filter, Mic, Calendar, BarChart2 } from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import { Card, Badge, EmptyState, PageLoader } from '../components/ui'
import { getInterviewHistory } from '../services/api'
import { useAuthContext } from '../context/AuthContext'

function scoreColor(s) {
  if (!s) return 'text-gray-500'
  if (s >= 80) return 'text-green-400'
  if (s >= 65) return 'text-blue-400'
  if (s >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

export default function HistoryPage() {
  const { getAuthToken } = useAuthContext()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAuthToken()
        const data = await getInterviewHistory(token, 50, 0)
        setSessions(data)
      } catch (err) {
        console.error('History load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filter + sort
  const filtered = sessions
    .filter(s => {
      const matchSearch = !search || s.topic?.toLowerCase().includes(search.toLowerCase())
      const matchDiff = filterDifficulty === 'all' || s.difficulty === filterDifficulty
      return matchSearch && matchDiff
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.interview_date) - new Date(a.interview_date)
      if (sortBy === 'score') return (b.overall_score || 0) - (a.overall_score || 0)
      return 0
    })

  if (loading) return <PageLoader message="Loading interview history..." />

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Interview History</h1>
            <p className="text-gray-400 text-sm mt-1">
              {sessions.length} interview{sessions.length !== 1 ? 's' : ''} completed
            </p>
          </div>
          <Link to="/interview/setup">
            <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors">
              <Mic size={15} /> New Interview
            </button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by topic..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-dark-600 border border-white/10 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Difficulty filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-500" />
              {['all', 'easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDifficulty(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                    filterDifficulty === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-600 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  {d === 'all' ? 'All' : d}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-dark-600 border border-white/10 text-gray-300 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="date">Sort: Newest First</option>
              <option value="score">Sort: Highest Score</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        {filtered.length === 0 ? (
          <Card className="p-12">
            <EmptyState
              icon={<Mic size={40} />}
              title={sessions.length === 0 ? 'No interviews yet' : 'No results found'}
              description={
                sessions.length === 0
                  ? 'Take your first interview to see history here.'
                  : 'Try adjusting your search or filter.'
              }
              action={
                sessions.length === 0 && (
                  <Link to="/interview/setup">
                    <button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
                      Start First Interview
                    </button>
                  </Link>
                )
              }
            />
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Interview</th>
                        <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Difficulty</th>
                        <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall</th>
                        <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Technical</th>
                        <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Communication</th>
                        <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map(s => (
                        <tr key={s.id} className="hover:bg-white/2 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-primary-600/20 rounded-xl flex items-center justify-center">
                                <Mic size={14} className="text-primary-400" />
                              </div>
                              <div>
                                <p className="text-white text-sm font-semibold">{s.topic}</p>
                                <p className="text-gray-500 text-xs">{s.total_questions} questions</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-gray-400 text-sm">{s.topic}</span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={s.difficulty}>{s.difficulty}</Badge>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-lg font-black ${scoreColor(s.overall_score)}`}>
                              {s.overall_score ? Math.round(s.overall_score) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-sm font-semibold ${scoreColor(s.technical_score)}`}>
                              {s.technical_score ? Math.round(s.technical_score) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-sm font-semibold ${scoreColor(s.communication_score)}`}>
                              {s.communication_score ? Math.round(s.communication_score) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-gray-400 text-xs">
                              {new Date(s.interview_date).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Link to={`/reports/${s.id}`}>
                              <button className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 text-xs font-semibold bg-primary-900/20 hover:bg-primary-900/30 px-3 py-1.5 rounded-lg transition-colors mx-auto">
                                <Eye size={12} /> View
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(s => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{s.topic}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={s.difficulty}>{s.difficulty}</Badge>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(s.interview_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-none">
                      <span className={`text-2xl font-black ${scoreColor(s.overall_score)}`}>
                        {s.overall_score ? Math.round(s.overall_score) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Tech: <span className={scoreColor(s.technical_score)}>{s.technical_score ? Math.round(s.technical_score) : '—'}</span></span>
                      <span>Comm: <span className={scoreColor(s.communication_score)}>{s.communication_score ? Math.round(s.communication_score) : '—'}</span></span>
                    </div>
                    <Link to={`/reports/${s.id}`}>
                      <button className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 text-xs font-semibold">
                        <Eye size={12} /> View Report
                      </button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
