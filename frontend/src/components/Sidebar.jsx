import React from 'react'

const TOPICS = [
  { id: 'DSA',               label: 'DSA',               icon: '</>' },
  { id: 'DBMS',              label: 'DBMS',               icon: '🗄'  },
  { id: 'OOPs',              label: 'OOPs',               icon: '📦'  },
  { id: 'Operating Systems', label: 'Operating Systems',  icon: '⚙️'  },
  { id: 'Computer Networks', label: 'Computer Networks',  icon: '🌐'  },
  { id: 'HR Interview',      label: 'HR Interview',       icon: '👥'  },
  { id: 'Machine Learning',  label: 'Machine Learning',   icon: '🧠'  },
  { id: 'Python',            label: 'Python',             icon: '🐍'  },
  { id: 'SQL',               label: 'SQL',                icon: '📋'  },
]

const DIFFICULTIES = [
  { id: 'Easy',   cls: 'easy'   },
  { id: 'Medium', cls: 'medium' },
  { id: 'Hard',   cls: 'hard'   },
]

export default function Sidebar({ topic, setTopic, difficulty, setDifficulty, onStart, loading }) {
  return (
    <div className="sidebar">
      <div className="sidebar-heading">Interview Setup</div>

      <div className="section-label">Select Topic</div>
      <div className="topic-list">
        {TOPICS.map(t => (
          <div
            key={t.id}
            className={`topic-row${topic === t.id ? ' active' : ''}`}
            onClick={() => setTopic(t.id)}
          >
            <div className="radio-circle">
              {topic === t.id && <div className="radio-dot" />}
            </div>
            <span className="topic-icon">{t.icon}</span>
            <span className="topic-name">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="section-label">Select Difficulty</div>
      <div className="diff-list">
        {DIFFICULTIES.map(d => (
          <div
            key={d.id}
            className={`diff-row ${d.cls}${difficulty === d.id ? ' active' : ''}`}
            onClick={() => setDifficulty(d.id)}
          >
            <div className="diff-radio">
              {difficulty === d.id && <div className="radio-dot" />}
            </div>
            <span className="diff-name">{d.id}</span>
          </div>
        ))}
      </div>

      <button
        className="start-btn"
        onClick={onStart}
        disabled={!topic || !difficulty || loading}
      >
        {loading ? (
          <>
            <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
            Starting...
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Interview
          </>
        )}
      </button>
    </div>
  )
}
