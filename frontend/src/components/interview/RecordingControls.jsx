import React from 'react'
import { Mic, RotateCcw, Send, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '../ui'

export default function RecordingControls({
  isRecording,
  hasTranscript,
  onStart,
  onStop,
  onReRecord,
  onSubmit,
  disabled = false,
  submitting = false,
  phase = 'recording',
}) {
  const isSubmitted = phase === 'feedback'
  const isProcessing = phase === 'processing'

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {isProcessing && (
        <Button
          disabled
          size="lg"
          className="min-w-[160px] bg-primary-600/50 border border-primary-500/30 text-primary-300 cursor-not-allowed"
        >
          <Loader2 size={16} className="animate-spin mr-1.5" />
          Evaluating Answer...
        </Button>
      )}

      {isSubmitted && (
        <Button
          disabled
          size="lg"
          className="min-w-[160px] bg-green-600/20 border border-green-500/30 text-green-400 cursor-not-allowed"
        >
          <CheckCircle size={16} className="mr-1.5 text-green-400" />
          Answer Submitted
        </Button>
      )}

      {!isProcessing && !isSubmitted && !isRecording && !hasTranscript && (
        <Button
          onClick={onStart}
          disabled={disabled}
          size="lg"
          className="min-w-[160px] bg-green-600 hover:bg-green-700 focus:ring-green-500"
        >
          <Mic size={18} />
          Start Recording
        </Button>
      )}

      {!isProcessing && !isSubmitted && isRecording && (
        <Button
          onClick={onStop}
          size="lg"
          variant="danger"
          className="min-w-[160px] bg-red-600 hover:bg-red-700 text-white border-0"
        >
          <div className="w-3 h-3 bg-white rounded-sm mr-1.5" />
          Stop Recording
        </Button>
      )}

      {!isProcessing && !isSubmitted && !isRecording && hasTranscript && (
        <>
          <Button
            onClick={onReRecord}
            variant="secondary"
            size="md"
          >
            <RotateCcw size={16} />
            Re-Record
          </Button>
          <Button
            onClick={onSubmit}
            loading={submitting}
            disabled={submitting}
            size="lg"
            className="min-w-[160px]"
          >
            <Send size={16} />
            Submit Answer
          </Button>
        </>
      )}

      {/* Hint text */}
      {!isProcessing && !isSubmitted && !isRecording && !hasTranscript && (
        <p className="w-full text-center text-gray-500 text-xs mt-1">
          Press Start Recording, then speak your answer clearly
        </p>
      )}
      {!isProcessing && !isSubmitted && isRecording && (
        <p className="w-full text-center text-green-400 text-xs mt-1 animate-pulse">
          🔴 Recording... Speak your answer
        </p>
      )}
      {!isProcessing && !isSubmitted && !isRecording && hasTranscript && (
        <p className="w-full text-center text-gray-500 text-xs mt-1">
          Review your answer above, then submit or re-record
        </p>
      )}
      {isProcessing && (
        <p className="w-full text-center text-primary-400 text-xs mt-1 animate-pulse">
          Analyzing your speech and evaluating response...
        </p>
      )}
      {isSubmitted && (
        <p className="w-full text-center text-green-400 text-xs mt-1">
          ✓ AI report generated successfully. View details below.
        </p>
      )}
    </div>
  )
}
