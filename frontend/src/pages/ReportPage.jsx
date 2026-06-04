import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'
import {
  CheckCircle, XCircle, Lightbulb, ArrowLeft,
  Calendar, Clock, BarChart2, MessageSquare,
  ChevronDown, ChevronUp, Award, TrendingUp
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import { Card, Badge, ScoreRing, ScoreBar, PageLoader } from '../components/ui'
import { getReport } from '../services/api'
import { useAuthContext } from '../context/AuthContext'

// ─── Score color helper ───────────────────────────────────
function scoreColor(s) {
  if (s >= 80) return 'text-green-400'
  if (s >= 65) return 'text-blue-400'
  if (s >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBg(s) {
  if (s >= 80) return 'bg-green-900/20 border-green-500/20'
  if (s >= 65) return 'bg-blue-900/20 border-blue-500/20'
  if (s >= 50) return 'bg-yellow-900/20 border-yellow-500/20'
  return 'bg-red-900/20 border-red-500/20'
}

function scoreLabel(s) {
  if (s >= 80) return 'Excellent'
  if (s >= 65) return 'Good'
  if (s >= 50) return 'Average'
  return 'Needs Work'
}

// ─── Metric Card ─────────────────────────────────────────
function MetricCard({ label, score }) {
  return (
    <div className={`flex flex-col items-center p-4 rounded-2xl border ${scoreBg(score)}`}>
      <span className={`text-2xl font-black ${scoreColor(score)}`}>{Math.round(score)}</span>
      <span className="text-gray-400 text-xs mt-1 text-center">{label}</span>
      <span className={`text-xs font-semibold mt-1 ${scoreColor(score)}`}>{scoreLabel(score)}</span>
    </div>
  )
}

// ─── Single Question Card ─────────────────────────────────
function QuestionCard({ item, index }) {
  const [open, setOpen] = useState(index === 0)
  const tech = item.technical
  const comm = item.communication
  const avgTech = tech ? (tech.technical_score + tech.conceptual_score + tech.relevance_score) / 3 : null

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Question number */}
        <div className={`w-10 h-10 rounded-xl flex-none flex items-center justify-center font-bold text-sm ${
          item.question_type === 'followup'
            ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20'
            : 'bg-primary-900/30 text-primary-400 border border-primary-500/20'
        }`}>
          {item.question_type === 'followup' ? 'FU' : `Q${index + 1}`}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium line-clamp-2">{item.question_text}</p>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={item.question_type === 'followup' ? 'warning' : 'primary'}>
              {item.question_type === 'followup' ? 'Follow-up' : 'Main Question'}
            </Badge>
            {avgTech !== null && (
              <span className={`text-xs font-semibold ${scoreColor(avgTech)}`}>
                Tech: {Math.round(avgTech)}/100
              </span>
            )}
            {comm && (
              <span className={`text-xs font-semibold ${scoreColor(comm.communication_score)}`}>
                Comm: {Math.round(comm.communication_score)}/100
              </span>
            )}
          </div>
        </div>

        {open ? <ChevronUp size={16} className="text-gray-400 flex-none" /> : <ChevronDown size={16} className="text-gray-400 flex-none" />}
      </button>

      {open && (
        <div className="border-t border-white/5 p-5 space-y-5">
          {/* Overall Overview */}
          {tech?.brief_overview && (
            <div className="bg-primary-600/10 border border-primary-500/20 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-xs font-bold text-primary-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb size={12} /> Overall Overview
              </p>
              <p className="text-xs text-gray-200 leading-relaxed font-medium mt-1">
                {tech.brief_overview}
              </p>
            </div>
          )}

          {/* Transcript */}
          {item.transcript && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Answer</p>
              <div className="bg-dark-600/60 rounded-xl p-4">
                <p className="text-gray-200 text-sm leading-relaxed">{item.transcript}</p>
                {item.duration && (
                  <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
                    <Clock size={10} /> {Math.round(item.duration)}s answer duration
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Technical Scores */}
            {tech && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Technical Scores</p>
                <div className="space-y-3">
                  <ScoreBar label="Technical Accuracy"       score={tech.technical_score}  color="primary" />
                  <ScoreBar label="Conceptual Understanding" score={tech.conceptual_score}  color="blue" />
                  <ScoreBar label="Answer Relevance"         score={tech.relevance_score}   color="green" />
                </div>

                {tech.strengths?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-green-400 uppercase mb-2 flex items-center gap-1.5">
                      <CheckCircle size={11} /> Strengths
                    </p>
                    <ul className="space-y-1.5">
                      {tech.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5 flex-none">✓</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tech.weaknesses?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-red-400 uppercase mb-2 flex items-center gap-1.5">
                      <XCircle size={11} /> Areas to Improve
                    </p>
                    <ul className="space-y-1.5">
                      {tech.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5 flex-none">✗</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Communication Scores */}
            {comm && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Communication Scores</p>
                <div className="space-y-3">
                  <ScoreBar label="Grammar"       score={comm.grammar_score}       color="blue" />
                  <ScoreBar label="Fluency"        score={comm.fluency_score}        color="green" />
                  <ScoreBar label="Confidence"     score={comm.confidence_score}     color="yellow" />
                  <ScoreBar label="Communication"  score={comm.communication_score}  color="primary" />
                </div>

                {comm.vocab_diversity && (
                  <div className="mt-3">
                    <ScoreBar label="Vocabulary Diversity" score={comm.vocab_diversity} color="primary" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Follow-up Questions Section */}
          {item.follow_ups && item.follow_ups.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/5 space-y-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Follow-up Dialogue</p>
              
              {item.follow_ups.map((fu, fuIdx) => {
                const fuTech = fu.technical
                const fuComm = fu.communication
                const avgFuTech = fuTech ? (fuTech.technical_score + fuTech.conceptual_score + fuTech.relevance_score) / 3 : null
                
                return (
                  <div key={fu.question_id} className="pl-4 border-l-2 border-primary-500/20 space-y-4 py-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="warning">Follow-up {fuIdx + 1}</Badge>
                      {avgFuTech !== null && (
                        <span className={`text-xs font-semibold ${scoreColor(avgFuTech)}`}>
                          Tech: {Math.round(avgFuTech)}/100
                        </span>
                      )}
                      {fuComm && (
                        <span className={`text-xs font-semibold ${scoreColor(fuComm.communication_score)}`}>
                          Comm: {Math.round(fuComm.communication_score)}/100
                        </span>
                      )}
                    </div>
                    
                    {/* Follow-up Question Text */}
                    <div className="bg-dark-600/40 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Follow-up Question Asked by AI</p>
                      <p className="text-gray-200 text-sm leading-relaxed font-semibold">{fu.question_text}</p>
                    </div>

                    {/* Follow-up Answer Transcript */}
                    {fu.transcript && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Your Response</p>
                        <div className="bg-dark-600/60 rounded-xl p-4">
                          <p className="text-gray-200 text-sm leading-relaxed">{fu.transcript}</p>
                          {fu.duration && (
                            <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
                              <Clock size={10} /> {Math.round(fu.duration)}s answer duration
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technical & Communication Scores side-by-side */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {fuTech && (
                        <div className="space-y-3 bg-dark-800/30 rounded-xl p-4 border border-white/5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Technical Scores</p>
                          <ScoreBar label="Technical Accuracy" score={fuTech.technical_score} color="primary" />
                          <ScoreBar label="Conceptual Understanding" score={fuTech.conceptual_score} color="blue" />
                          
                          {fuTech.strengths?.length > 0 && (
                            <div className="mt-3 text-xs text-gray-300">
                              <span className="text-green-400 font-bold">✓ Strengths: </span> {fuTech.strengths.join(', ')}
                            </div>
                          )}
                          {fuTech.weaknesses?.length > 0 && (
                            <div className="mt-1 text-xs text-gray-300">
                              <span className="text-red-400 font-bold">✗ Areas to Improve: </span> {fuTech.weaknesses.join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      {fuComm && (
                        <div className="space-y-3 bg-dark-800/30 rounded-xl p-4 border border-white/5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Communication Scores</p>
                          <ScoreBar label="Grammar" score={fuComm.grammar_score} color="blue" />
                          <ScoreBar label="Fluency" score={fuComm.fluency_score} color="green" />
                          <ScoreBar label="Confidence" score={fuComm.confidence_score} color="yellow" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </Card>
  )
}

// ─── Main Report Page ─────────────────────────────────────
export default function ReportPage() {
  const { sessionId } = useParams()
  const { getAuthToken } = useAuthContext()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAuthToken()
        const data = await getReport(token, sessionId)
        setReport(data)
      } catch (err) {
        setError(err.message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (loading) return <PageLoader message="Loading your report..." />

  if (error) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400">{error}</p>
        <Link to="/history">
          <button className="text-primary-400 hover:text-primary-300 text-sm">← Back to History</button>
        </Link>
      </div>
    </DashboardLayout>
  )

  if (!report) return null

  // Radar chart data
  const radarData = [
    { subject: 'Technical',    A: Math.round(report.technical_score || 0) },
    { subject: 'Conceptual',   A: Math.round(report.technical_score * 0.95 || 0) },
    { subject: 'Relevance',    A: Math.round(report.technical_score * 0.9 || 0) },
    { subject: 'Grammar',      A: Math.round(report.grammar_score || 0) },
    { subject: 'Fluency',      A: Math.round(report.fluency_score || 0) },
    { subject: 'Confidence',   A: Math.round(report.confidence_score || 0) },
  ]

  const diffMap = { easy: 'easy', medium: 'medium', hard: 'hard' }
  const duration = report.duration
    ? `${Math.floor(report.duration / 60)}m ${report.duration % 60}s`
    : 'N/A'

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/history">
                <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>
              </Link>
            </div>
            <h1 className="text-2xl font-black text-white">Interview Report</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant="primary">{report.topic}</Badge>
              <Badge variant={diffMap[report.difficulty] || 'default'}>{report.difficulty}</Badge>
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <Calendar size={11} />
                {report.interview_date
                  ? new Date(report.interview_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A'}
              </span>
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <Clock size={11} /> {duration}
              </span>
            </div>
          </div>
        </div>

        {/* Overall Score + Metrics */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Big score ring */}
          <Card className="p-8 flex flex-col items-center justify-center col-span-1">
            <ScoreRing score={report.overall_score} size={140} />
            <p className="text-gray-400 text-sm mt-4">Overall Score</p>
            <Badge
              variant={report.overall_score >= 80 ? 'success' : report.overall_score >= 60 ? 'primary' : 'warning'}
              className="mt-2"
            >
              {scoreLabel(report.overall_score)}
            </Badge>
          </Card>

          {/* Metrics grid */}
          <Card className="p-6 col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Score Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard label="Technical"     score={report.technical_score || 0} />
              <MetricCard label="Communication" score={report.communication_score || 0} />
              <MetricCard label="Grammar"       score={report.grammar_score || 0} />
              <MetricCard label="Fluency"       score={report.fluency_score || 0} />
              <MetricCard label="Confidence"    score={report.confidence_score || 0} />
              <div className={`flex flex-col items-center p-4 rounded-2xl border ${scoreBg(report.overall_score)}`}>
                <span className={`text-2xl font-black ${scoreColor(report.overall_score)}`}>
                  {report.questions?.length || 0}
                </span>
                <span className="text-gray-400 text-xs mt-1 text-center">Questions</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Radar + Feedback Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card className="p-6">
            <p className="text-white font-bold mb-4">Performance Radar</p>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#22222f" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#7f77dd"
                  fill="#7f77dd"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{ background: '#16161f', border: '1px solid #353550', borderRadius: '8px', color: '#e2e8f0' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Summary Cards */}
          <div className="space-y-4">
            {/* Strengths */}
            <Card className="p-5">
              <p className="text-green-400 font-bold text-sm flex items-center gap-2 mb-3">
                <Award size={15} /> Strengths
              </p>
              {report.strengths_summary?.length > 0 ? (
                <ul className="space-y-2">
                  {report.strengths_summary.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle size={13} className="text-green-400 mt-0.5 flex-none" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-600 text-sm">No data</p>}
            </Card>

            {/* Weaknesses */}
            <Card className="p-5">
              <p className="text-red-400 font-bold text-sm flex items-center gap-2 mb-3">
                <XCircle size={15} /> Areas to Improve
              </p>
              {report.weaknesses_summary?.length > 0 ? (
                <ul className="space-y-2">
                  {report.weaknesses_summary.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <XCircle size={13} className="text-red-400 mt-0.5 flex-none" />
                      {w}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-600 text-sm">No data</p>}
            </Card>

            {/* Improvement Plan */}
            <Card className="p-5">
              <p className="text-blue-400 font-bold text-sm flex items-center gap-2 mb-3">
                <TrendingUp size={15} /> Improvement Plan
              </p>
              {report.improvement_plan?.length > 0 ? (
                <ul className="space-y-2">
                  {report.improvement_plan.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-blue-400 font-bold text-xs mt-0.5 flex-none">{i + 1}.</span>
                      {p}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-600 text-sm">No data</p>}
            </Card>
          </div>
        </div>

        {/* Per-Question Breakdown */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Question-by-Question Breakdown</h2>
          <div className="space-y-3">
            {(() => {
              const questions = report.questions || []
              const mainQuestions = questions.filter(q => q.question_type === 'main')
              const followUps = questions.filter(q => q.question_type === 'followup')
              
              const grouped = mainQuestions.map(mq => ({
                ...mq,
                follow_ups: followUps.filter(fq => fq.parent_question_id === mq.question_id)
              }))
              
              return grouped.map((item, i) => (
                <QuestionCard key={item.question_id} item={item} index={i} />
              ))
            })()}
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center pb-8">
          <Link to="/interview/setup">
            <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors">
              Practice Again
            </button>
          </Link>
          <Link to="/history">
            <button className="flex items-center gap-2 bg-dark-600 border border-white/10 hover:bg-dark-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors">
              View History
            </button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
