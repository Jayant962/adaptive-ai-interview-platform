import React from 'react'

const METRICS = [
  {
    key: 'grammar_score',
    label: 'Grammar',
    icon: 'Aa',
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    barColor: '#16a34a',
  },
  {
    key: 'fluency_score',
    label: 'Fluency',
    icon: '♫',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    barColor: '#2563eb',
  },
  {
    key: 'confidence_score',
    label: 'Confidence',
    icon: '🛡',
    iconBg: '#f5f3ff',
    iconColor: '#7c3aed',
    barColor: '#7c3aed',
  },
  {
    key: 'conceptual_score',
    label: 'Conceptual\nCorrectness',
    icon: '🎯',
    iconBg: '#fff7ed',
    iconColor: '#d97706',
    barColor: '#d97706',
  },
  {
    key: 'overall_score',
    label: 'Overall Score',
    icon: '🏆',
    iconBg: '#f8fafc',
    iconColor: '#0f172a',
    barColor: '#0f172a',
  },
]

export default function ScoreCards({ scores }) {
  return (
    <div className="score-grid">
      {METRICS.map(m => {
        const val = scores ? (scores[m.key] ?? 0) : null
        return (
          <div className="score-card" key={m.key}>
            <div className="score-card-top">
              <div
                className="score-icon"
                style={{ background: m.iconBg, color: m.iconColor }}
              >
                {m.icon}
              </div>
              <span className="score-label" style={{ whiteSpace: 'pre-line' }}>
                {m.label}
              </span>
            </div>

            <div className="score-val">
              {val !== null ? Math.round(val) : '—'}
              {' '}<span>/ 100</span>
            </div>

            <div className="score-bar-track">
              <div
                className="score-bar-fill"
                style={{
                  width: val !== null ? `${val}%` : '0%',
                  background: m.barColor,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
