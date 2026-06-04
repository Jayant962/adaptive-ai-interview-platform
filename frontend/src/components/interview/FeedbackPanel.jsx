import React, { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Lightbulb, AlertCircle } from 'lucide-react'
import { ScoreBar } from '../ui'
import { clsx } from 'clsx'

export default function FeedbackPanel({ feedback, onNext, nextLabel = 'Next Question' }) {
  const [expanded, setExpanded] = useState(true)
  if (!feedback) return null

  const { technical_feedback: tech, communication_feedback: comm } = feedback

  return (
    <div className="bg-dark-700/80 border border-white/10 rounded-2xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600/20 rounded-xl flex items-center justify-center">
            <CheckCircle size={16} className="text-primary-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Answer Evaluated</p>
            <p className="text-gray-500 text-xs">
              Technical: {Math.round(tech?.technical_score || 0)} •
              Communication: {Math.round(comm?.communication_score || 0)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onNext?.() }}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {nextLabel}
          </button>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 grid md:grid-cols-2 gap-6">
          {/* Overall Overview */}
          {tech?.brief_overview && (
            <div className="col-span-1 md:col-span-2 bg-primary-600/10 border border-primary-500/20 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-xs font-bold text-primary-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb size={12} /> Overall Overview
              </p>
              <p className="text-xs text-gray-200 leading-relaxed font-medium mt-1">
                {tech.brief_overview}
              </p>
            </div>
          )}

          {/* Technical Feedback */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Technical Analysis</p>
            <div className="space-y-3">
              <ScoreBar label="Technical Accuracy" score={tech?.technical_score || 0} color="primary" />
              <ScoreBar label="Conceptual Understanding" score={tech?.conceptual_score || 0} color="blue" />
              <ScoreBar label="Answer Relevance" score={tech?.relevance_score || 0} color="green" />
            </div>

            {tech?.strengths?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-green-400 uppercase mb-2 flex items-center gap-1">
                  <CheckCircle size={12} /> Strengths
                </p>
                <ul className="space-y-1">
                  {tech.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5 flex-none">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tech?.weaknesses?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-red-400 uppercase mb-2 flex items-center gap-1">
                  <XCircle size={12} /> To Improve
                </p>
                <ul className="space-y-1">
                  {tech.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5 flex-none">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Communication Feedback */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Communication Analysis</p>
            <div className="space-y-3">
              <ScoreBar label="Grammar" score={comm?.grammar_score || 0} color="blue" />
              <ScoreBar label="Fluency" score={comm?.fluency_score || 0} color="green" />
              <ScoreBar label="Confidence" score={comm?.confidence_score || 0} color="yellow" />
            </div>
          </div>

          {/* Proceed to Next Question Button */}
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-end w-full col-span-1 md:col-span-2">
            <button
              onClick={onNext}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-primary-600/30 flex items-center gap-2 transform active:scale-95"
            >
              {nextLabel} &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
