import React from 'react'

export default function FeedbackCards({ evaluation }) {
  const feedback    = evaluation?.ai_feedback  || ''
  const strengths   = evaluation?.strengths    || []
  const weaknesses  = evaluation?.weaknesses   || []
  const suggestions = evaluation?.suggestions  || []

  const placeholder = <span className="muted-text">Will appear after first submission.</span>

  return (
    <div className="feedback-grid">
      {/* AI Feedback */}
      <div className="feedback-card">
        <div className="feedback-card-title">
          <span>💬</span> AI Feedback
        </div>
        <div className="feedback-body">
          {feedback || placeholder}
        </div>
      </div>

      {/* Strengths */}
      <div className="feedback-card">
        <div className="feedback-card-title" style={{ color: '#16a34a' }}>
          <span>👍</span> Strengths
        </div>
        <div className="feedback-body">
          {strengths.length > 0 ? (
            <ul className="feedback-list">
              {strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : placeholder}
        </div>
      </div>

      {/* Weaknesses */}
      <div className="feedback-card">
        <div className="feedback-card-title" style={{ color: '#dc2626' }}>
          <span>👎</span> Weaknesses
        </div>
        <div className="feedback-body">
          {weaknesses.length > 0 ? (
            <ul className="feedback-list">
              {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          ) : placeholder}
        </div>
      </div>

      {/* Suggestions */}
      <div className="feedback-card">
        <div className="feedback-card-title" style={{ color: '#d97706' }}>
          <span>💡</span> Suggestions
        </div>
        <div className="feedback-body">
          {suggestions.length > 0 ? (
            <ul className="feedback-list">
              {suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : placeholder}
        </div>
      </div>
    </div>
  )
}
