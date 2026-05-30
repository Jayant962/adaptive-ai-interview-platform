import React, { useState, useCallback } from 'react'
import Topbar from '../components/Topbar.jsx'
import Sidebar from '../components/Sidebar.jsx'
import InterviewPanel from '../components/InterviewPanel.jsx'
import ScoreCards from '../components/ScoreCards.jsx'
import FeedbackCards from '../components/FeedbackCards.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../utils/api.js'
import { useTimer } from '../utils/useTimer.js'

export default function DashboardPage() {
  const { token } = useAuth()

  // ── Sidebar selections ────────────────────────────────────
  const [topic,        setTopic]        = useState('DSA')
  const [difficulty,   setDifficulty]   = useState('Medium')
  const [showSidebar,  setShowSidebar]  = useState(true)

  // ── Interview session ─────────────────────────────────────
  const [interviewActive, setInterviewActive] = useState(false)
  const [startLoading,    setStartLoading]    = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [globalError,     setGlobalError]     = useState('')

  const [interviewId,     setInterviewId]     = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)   // { id, text }
  const [questionNumber,  setQuestionNumber]  = useState(1)
  const [liveDifficulty,  setLiveDifficulty]  = useState('Medium')

  // ── Evaluation ────────────────────────────────────────────
  const [scores,     setScores]     = useState(null)
  const [evaluation, setEvaluation] = useState(null)

  // ── Timer ─────────────────────────────────────────────────
  const { formatted: timerFormatted, reset: resetTimer } = useTimer(interviewActive)

  // ── Session key — remounts panel fresh on each new interview ──
  const [sessionKey, setSessionKey] = useState(0)

  // ── Stop interview ────────────────────────────────────────
  const handleStop = () => {
    setInterviewActive(false)
    setCurrentQuestion(null)
    setInterviewId(null)
    setQuestionNumber(1)
    setScores(null)
    setEvaluation(null)
    setGlobalError('')
    setShowSidebar(true)
    resetTimer()
  }

  // ── Start interview ───────────────────────────────────────
  const handleStart = async () => {
    setGlobalError('')
    setStartLoading(true)
    resetTimer()
    setSessionKey(k => k + 1)
    try {
      const data = await apiFetch('/interview/start', {
        method: 'POST',
        body: JSON.stringify({ topic, difficulty }),
      }, token)

      setInterviewId(data.interview_id)
      setCurrentQuestion({ id: data.question_id, text: data.question_text })
      setLiveDifficulty(data.difficulty)
      setQuestionNumber(1)
      setScores(null)
      setEvaluation(null)
      setInterviewActive(true)
      setShowSidebar(false)
    } catch (err) {
      setGlobalError(err.message)
    } finally {
      setStartLoading(false)
    }
  }

  // ── Submit transcript (text only — no audio upload) ───────
  const handleSubmitTranscript = useCallback(async (transcript) => {
    if (!transcript || !interviewId || !currentQuestion) return
    setSubmitting(true)
    setGlobalError('')

    try {
      // Plain JSON — no FormData, no multipart
      const result = await apiFetch('/interview/submit-answer', {
        method: 'POST',
        body: JSON.stringify({
          interview_id: interviewId,
          question_id:  currentQuestion.id,
          transcript,
        }),
      }, token)

      setScores({
        grammar_score:    result.grammar_score,
        fluency_score:    result.fluency_score,
        confidence_score: result.confidence_score,
        conceptual_score: result.conceptual_score,
        overall_score:    result.overall_score,
      })

      setEvaluation({
        ai_feedback: result.ai_feedback,
        strengths:   result.strengths,
        weaknesses:  result.weaknesses,
        suggestions: result.suggestions,
      })

      if (result.next_question_id && result.next_question_text) {
        setCurrentQuestion({ id: result.next_question_id, text: result.next_question_text })
        setQuestionNumber(n => n + 1)
      }
    } catch (err) {
      setGlobalError(`Submission failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }, [interviewId, currentQuestion, token])

  // ── Derived interview state passed to panel ───────────────
  const interviewState = (interviewActive && currentQuestion)
    ? { topic, difficulty: liveDifficulty, questionText: currentQuestion.text, questionNumber }
    : null

  return (
    <div className="dashboard">
      <Topbar timerActive={interviewActive} timerFormatted={timerFormatted()} />

      <div className="dashboard-body">
        {showSidebar && (
          <Sidebar
            topic={topic}           setTopic={setTopic}
            difficulty={difficulty} setDifficulty={setDifficulty}
            onStart={handleStart}
            loading={startLoading}
          />
        )}

        <div className="main-content">
          {globalError && (
            <div className="alert alert-error">
              <span>⚠</span> {globalError}
            </div>
          )}

          <InterviewPanel
            key={sessionKey}
            interviewState={interviewState}
            onSubmitTranscript={handleSubmitTranscript}
            onStop={handleStop}
            submitting={submitting}
          />

          <div className="performance-section">
            <div className="section-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Live Performance
            </div>
            <ScoreCards scores={scores} />
            <FeedbackCards evaluation={evaluation} />
          </div>
        </div>
      </div>
    </div>
  )
}
