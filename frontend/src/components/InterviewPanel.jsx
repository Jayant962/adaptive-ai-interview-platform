import React from 'react'
import { useSpeechRecognition } from '../utils/useSpeechRecognition.js'

export default function InterviewPanel({ interviewState, onSubmitTranscript, onStop, submitting }) {
  const {
    isListening,
    transcript,
    stableTranscript,
    interimText,
    sttError,
    isSupported,
    supportMessage,
    browserName,
    startListening,
    stopListening,
    resetSpeech,
  } = useSpeechRecognition()

  const displayText = isListening ? transcript : stableTranscript
  const hasAnswer   = stableTranscript.trim().length > 0 && !isListening

  const handleStart = () => {
    resetSpeech()
    startListening()
  }

  const handleStop = () => {
    stopListening()
  }

  const handleSubmit = async () => {
    if (!stableTranscript.trim()) return
    await onSubmitTranscript(stableTranscript.trim())
    resetSpeech()
  }

  // ── Empty / pre-start state ──────────────────────────────
  if (!interviewState) {
    return (
      <div className="interview-panel">
        <div className="panel-header">
          <div className="panel-title">AI Interview Session</div>
          <div className="panel-sub">
            Get ready! AI will ask you questions based on your selected topic and difficulty.
          </div>
        </div>
        <div className="empty-state">
          <div className="bot-avatar">🤖</div>
          <div className="empty-title">Your interview session will appear here</div>
          <div className="empty-sub">Click "Start Interview" to begin your AI-powered interview.</div>
        </div>
      </div>
    )
  }

  const { topic, difficulty, questionText, questionNumber } = interviewState

  return (
    <div className="interview-panel">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="panel-header">
        <div className="panel-header-row">
          <div>
            <div className="panel-title">AI Interview Session</div>
            <div className="badge-row">
              <span className="topic-badge">{topic}</span>
              <span className={`diff-badge ${difficulty?.toLowerCase()}`}>{difficulty}</span>
            </div>
          </div>
          <div className="q-number-row">
            <div className="q-number">Question #{questionNumber}</div>
            <button
              className="stop-btn"
              onClick={onStop}
              disabled={submitting}
              title="Stop Interview"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop Interview
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="panel-body">
        {submitting ? (
          <div className="processing-row">
            <div className="spinner spinner-dark" />
            <span>Evaluating your answer and generating next question…</span>
          </div>
        ) : (
          <>
            {/* Question */}
            <div className="ai-label">🤖 AI Question</div>
            <div className="question-box">{questionText}</div>

            {/* Browser not supported — show specific instructions */}
            {!isSupported && (
              <div className="browser-support-box">
                <div className="browser-support-title">
                  ⚠ Speech recognition not available in {browserName}
                </div>
                <div className="browser-support-msg">{supportMessage}</div>
                <div className="browser-support-links">
                  <span>Best supported in: </span>
                  <strong>Chrome</strong> · <strong>Edge</strong> · <strong>Brave</strong> (shields off)
                </div>
              </div>
            )}

            {/* STT error (permission denied, network, etc.) */}
            {sttError && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                ⚠ {sttError}
              </div>
            )}

            {/* ── LIVE: currently speaking ── */}
            {isListening && (
              <div className="transcript-box transcript-box--live">
                <div className="transcript-label">
                  <span className="rec-dot" /> Listening — speak your answer…
                </div>
                <div className="transcript-text">
                  {transcript
                    ? <>{transcript}{interimText && <span className="interim-text"> {interimText}</span>}</>
                    : <span className="transcript-placeholder">
                        {interimText || 'Your words will appear here...'}
                      </span>
                  }
                </div>
              </div>
            )}

            {/* ── DONE: answer captured ── */}
            {!isListening && hasAnswer && (
              <div className="transcript-box transcript-box--done">
                <div className="transcript-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="#16a34a" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Answer recorded — ready to submit
                </div>
                <div className="transcript-text">{displayText}</div>
              </div>
            )}

            {/* ── Controls ── */}
            <div className="audio-controls">
              {!isListening ? (
                <button
                  className="rec-btn start"
                  onClick={handleStart}
                  disabled={submitting || !isSupported}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8"  y1="23" x2="16" y2="23"/>
                  </svg>
                  {hasAnswer ? 'Re-record Answer' : 'Start Speaking'}
                </button>
              ) : (
                <button className="rec-btn stop" onClick={handleStop}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="5" y="5" width="14" height="14" />
                  </svg>
                  Stop Speaking
                </button>
              )}
            </div>

            {/* ── Submit ── */}
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!hasAnswer || submitting}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Submit Answer
            </button>
          </>
        )}
      </div>
    </div>
  )
}