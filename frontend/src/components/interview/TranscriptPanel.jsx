import React from 'react'
import { clsx } from 'clsx'
import { FileText, Mic } from 'lucide-react'

export default function TranscriptPanel({ liveTranscript, finalTranscript, isRecording }) {
  const displayText = finalTranscript || liveTranscript
  const hasText = displayText && displayText.trim().length > 0

  return (
    <div className="bg-dark-700/60 border border-white/8 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Transcript</span>
        {isRecording && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400">Recording</span>
          </div>
        )}
      </div>

      <div className={clsx(
        'min-h-[80px] max-h-[160px] overflow-y-auto rounded-xl p-3 text-sm leading-relaxed transition-all',
        hasText ? 'bg-dark-600' : 'bg-dark-800/50'
      )}>
        {hasText ? (
          <span className="text-gray-200">
            {finalTranscript}
            {liveTranscript && (
              <span className="text-gray-400 italic">{' '}{liveTranscript}</span>
            )}
          </span>
        ) : (
          <div className="flex flex-col items-center justify-center h-16 gap-2">
            <Mic size={18} className="text-gray-600" />
            <p className="text-gray-600 text-xs text-center">
              {isRecording ? 'Listening for your answer...' : 'Your answer will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Word count */}
      {hasText && (
        <p className="text-right text-xs text-gray-600 mt-1">
          {displayText.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      )}
    </div>
  )
}
