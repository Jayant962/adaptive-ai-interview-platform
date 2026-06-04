import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Briefcase, Calendar, Clock, Sparkles, Brain, MessageSquare, ShieldAlert, ArrowRight, Lightbulb } from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import { Card, Badge, ScoreRing, ScoreBar, PageLoader, EmptyState } from '../components/ui'
import { getOverallReport } from '../services/api'
import { useAuthContext } from '../context/AuthContext'

export default function ReportsPage() {
  const { getAuthToken } = useAuthContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await getAuthToken()
        const result = await getOverallReport(token)
        setData(result)
      } catch (err) {
        setError(err.message || 'Failed to load overall report')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <PageLoader message="Compiling your overall report..." />

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <ShieldAlert size={40} className="text-red-500" />
          <p className="text-red-400">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-dark-600 border border-white/10 hover:bg-dark-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    )
  }

  if (!data || data.total_interviews === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-black text-white">Overall Performance Report</h1>
          <p className="text-gray-400 text-sm">Track your progress, conceptual strengths, communication skills, and matching job roles.</p>
          
          <Card className="p-8">
            <EmptyState
              icon={<Brain size={48} className="text-gray-600 animate-pulse" />}
              title="No Interview Reports Found"
              description="Please complete at least one mock interview session to unlock your overall performance analytics, conceptual knowledge ratings, and AI-powered job role recommendations."
              action={
                <Link to="/interview/setup">
                  <button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-primary-600/30">
                    Start Your First Interview
                  </button>
                </Link>
              }
            />
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white">Overall Performance Report</h1>
          <p className="text-gray-400 text-sm mt-1">
            Aggregated insights from {data.total_interviews} completed interview session{data.total_interviews > 1 ? 's' : ''}.
          </p>
        </div>

        {/* Overall Score Rings */}
        <div className="grid sm:grid-cols-3 gap-6">
          <Card className="p-6 flex flex-col items-center justify-center border-primary-500/20 bg-primary-950/5">
            <ScoreRing score={data.overall_score} size={130} label="Overall Score" />
            <p className="text-gray-400 text-xs text-center mt-3 max-w-[200px]">
              Weighted average of both your technical and communication metrics.
            </p>
          </Card>
          
          <Card className="p-6 flex flex-col items-center justify-center border-blue-500/20 bg-blue-950/5">
            <ScoreRing score={data.conceptual_score} size={130} label="Conceptual Knowledge" />
            <p className="text-gray-400 text-xs text-center mt-3 max-w-[200px]">
              Measures depth of logic, architectural thinking, and explanation detail.
            </p>
          </Card>

          <Card className="p-6 flex flex-col items-center justify-center border-green-500/20 bg-green-950/5">
            <ScoreRing score={data.communication_score} size={130} label="Communication Score" />
            <p className="text-gray-400 text-xs text-center mt-3 max-w-[200px]">
              Averages grammar, confidence, and fluency across all answers.
            </p>
          </Card>
        </div>

        {/* AI Job Fit Recommendation */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" />
            <h2 className="text-lg font-bold text-white">AI Recruiting Fit & Roles</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {data.recommended_roles.map((roleFit, i) => (
              <Card key={i} className="p-6 border border-white/5 bg-dark-700/40 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-600/5 rounded-bl-full pointer-events-none" />
                
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-primary-600/10 border border-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
                        <Briefcase size={16} />
                      </div>
                      <h3 className="text-white font-bold text-base leading-tight">{roleFit.role}</h3>
                    </div>
                    
                    <Badge variant={roleFit.match_percentage >= 85 ? 'success' : 'primary'} className="flex-none">
                      {roleFit.match_percentage}% Match
                    </Badge>
                  </div>
                  
                  <p className="text-gray-300 text-xs leading-relaxed mt-2 bg-dark-800/40 border border-white/5 rounded-xl p-3 font-medium">
                    <span className="text-gray-500 font-bold block text-[10px] uppercase mb-1 tracking-wider">Recruiter Justification</span>
                    {roleFit.justification}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    <span className="text-primary-400 font-bold uppercase text-[9px] tracking-wider block mb-0.5">Recommended Next Steps</span>
                    {roleFit.next_steps}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Topic Breakdown + Communication Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Topic Breakdown */}
          <Card className="p-6">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <Award size={15} className="text-primary-400" /> Average Topic Performance
            </h3>
            
            <div className="space-y-4">
              {Object.keys(data.topic_scores).length > 0 ? (
                Object.entries(data.topic_scores).map(([topic, score]) => (
                  <ScoreBar key={topic} label={topic} score={score} color="primary" />
                ))
              ) : (
                <p className="text-gray-500 text-xs">No topics recorded yet.</p>
              )}
            </div>
          </Card>

          {/* Detailed Communication breakdown */}
          <Card className="p-6">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <MessageSquare size={15} className="text-green-400" /> Communication Breakdown
            </h3>
            
            <div className="space-y-4">
              <ScoreBar label="Grammar Accuracy" score={data.grammar_score} color="blue" />
              <ScoreBar label="Speaking Fluency" score={data.fluency_score} color="green" />
              <ScoreBar label="Presentation Confidence" score={data.confidence_score} color="yellow" />
            </div>
            
            <div className="mt-6 bg-green-950/10 border border-green-500/10 rounded-xl p-3 text-[11px] text-gray-400 leading-relaxed">
              Your overall communication stands at <span className="text-green-400 font-bold">{data.communication_score}/100</span>. Fluency and sentence correctness are calculated based on filler patterns and vocabulary usage in your recordings.
            </div>
          </Card>
        </div>

        {/* Recent Interviews History Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Recent Interview Reports</h2>
          <div className="space-y-3">
            {data.recent_sessions.map((session) => (
              <Card key={session.session_id} className="p-4 flex items-center justify-between flex-wrap gap-4 hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-600/10 border border-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm leading-snug">{session.topic}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={session.difficulty === 'hard' ? 'hard' : session.difficulty === 'medium' ? 'medium' : 'easy'}>
                        {session.difficulty}
                      </Badge>
                      <span className="text-gray-500 text-[10px] flex items-center gap-1 font-medium">
                        <Calendar size={10} />
                        {new Date(session.interview_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <span className="text-gray-500 text-[10px] block uppercase font-bold tracking-wider">Score</span>
                    <span className="text-white font-black text-sm">{Math.round(session.overall_score)}/100</span>
                  </div>
                  <Link to={`/reports/${session.session_id}`}>
                    <button className="bg-dark-600 border border-white/10 hover:bg-dark-500 text-white font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-colors">
                      View Report <ArrowRight size={12} />
                    </button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
