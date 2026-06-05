import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Volume2, VolumeX, Maximize2, Loader2, Sun, Moon } from 'lucide-react'
import {
  useInterview,
  AVATAR_STATES,
  INTERVIEW_PHASES,
} from '../context/InterviewContext'
import { useAuthContext } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useDataContext } from '../context/DataContext'
import {
  submitAnswer, getFollowUp, getNextQuestion, endInterview
} from '../services/api'
import {
  createSpeechRecognition, startRecognition, stopRecognition,
  abortRecognition, speakText, stopSpeaking, loadVoices,
  isSpeechRecognitionSupported, transcribeAudioBlob
} from '../services/speech'
import AvatarPanel from '../components/interview/AvatarPanel'
import RecordingControls from '../components/interview/RecordingControls'
import TranscriptPanel from '../components/interview/TranscriptPanel'
import FeedbackPanel from '../components/interview/FeedbackPanel'
import { Badge, Card } from '../components/ui'
import { useTimer } from '../hooks/useTimer'

export default function InterviewPage() {
  const navigate = useNavigate()
  const { getAuthToken } = useAuthContext()
  const { isDark, toggle: toggleTheme } = useTheme()
  const { invalidateCache } = useDataContext()
  const interview = useInterview()
  const {
    sessionId, topic, difficulty, phase,
    avatarState, currentQuestion, currentQuestionId,
    questionNumber, totalQuestions, followUpCount,
    liveTranscript, finalTranscript, lastFeedback,
    setPhase, setAvatarState, setLiveTranscript, setFinalTranscript,
    setFeedback, setQuestion, setFollowUp, canFollowUp, resetInterview,
  } = interview

  const [isRecording, setIsRecording] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [questionLog, setQuestionLog] = useState([])
  const [exitConfirm, setExitConfirm] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [loadingNext, setLoadingNext] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const answerStartTime = useRef(null)
  const isRecordingRef = useRef(false)
  const accumulatedTranscriptRef = useRef('')
  const shouldSpeakRef = useRef(true)
  const { seconds: totalSeconds, formatted: totalFormatted } = useTimer(true)
  const { seconds: answerSeconds, formatted: answerFormatted, reset: resetAnswerTimer } = useTimer(isRecording)

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      navigate('/interview/setup')
    }
  }, [sessionId])

  const speakQuestion = useCallback((text) => {
    setPhase(INTERVIEW_PHASES.QUESTION)
    setAvatarState(AVATAR_STATES.SPEAKING)
    speakText(text, {
      rate: 0.92,
      onEnd: () => {
        setPhase(INTERVIEW_PHASES.RECORDING)
        setAvatarState(AVATAR_STATES.LISTENING)
      },
      onError: () => {
        setPhase(INTERVIEW_PHASES.RECORDING)
        setAvatarState(AVATAR_STATES.LISTENING)
      }
    })
  }, [setPhase, setAvatarState])

  // Load voices and speak first question on mount
  useEffect(() => {
    if (!currentQuestion || !sessionId) return
    let active = true
    shouldSpeakRef.current = true
    
    loadVoices().then(() => {
      if (active && shouldSpeakRef.current) {
        setPhase(INTERVIEW_PHASES.QUESTION)
        speakQuestion(currentQuestion)
      }
    })

    return () => {
      active = false
      shouldSpeakRef.current = false
      // Clean up TTS audio
      stopSpeaking()
      isRecordingRef.current = false
      
      // Clean up speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {
          console.error('Error aborting speech recognition during unmount:', e)
        }
      }

      // Clean up media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch (e) {
          console.error('Error stopping media recorder during unmount:', e)
        }
      }

      // Stop all tracks of active mic stream to release mic icon
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
        } catch (e) {
          console.error('Error stopping media stream tracks during unmount:', e)
        }
        mediaStreamRef.current = null
      }
    }
  }, [currentQuestion, sessionId, speakQuestion, setPhase])

  const startRecording = useCallback(() => {
    shouldSpeakRef.current = false
    stopSpeaking()
    setAvatarState(AVATAR_STATES.IDLE)
    setPhase(INTERVIEW_PHASES.RECORDING)

    setFinalTranscript('')
    setLiveTranscript('')
    setAudioUrl(null)
    answerStartTime.current = Date.now()
    resetAnswerTimer()

    isRecordingRef.current = true
    accumulatedTranscriptRef.current = ''
    setIsRecording(true)

    if (isMobile) {
      // Mobile Flow: MediaRecorder + Backend Whisper Transcription
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaStreamRef.current = stream
          const mediaRecorder = new MediaRecorder(stream)
          mediaRecorderRef.current = mediaRecorder
          audioChunksRef.current = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            const url = URL.createObjectURL(audioBlob)
            setAudioUrl(url)

            stream.getTracks().forEach(track => track.stop())
            mediaStreamRef.current = null

            setTranscribing(true)
            try {
              const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
              const transcript = await transcribeAudioBlob(audioBlob, rawApiUrl)
              setFinalTranscript(transcript)
              setPhase(INTERVIEW_PHASES.RECORDING)
              setAvatarState(AVATAR_STATES.LISTENING)
            } catch (err) {
              console.error('Transcription failed:', err)
              alert('Failed to transcribe audio. Please try speaking again.')
            } finally {
              setTranscribing(false)
            }
          }

          mediaRecorder.start()
          setAvatarState(AVATAR_STATES.LISTENING)
        })
        .catch(err => {
          console.error('Failed to start audio recording:', err)
          alert('Failed to access microphone. Please ensure microphone permissions are granted.')
          setIsRecording(false)
          isRecordingRef.current = false
          setAvatarState(AVATAR_STATES.IDLE)
        })
    } else {
      // Desktop Flow: Web Speech API (webkitSpeechRecognition) + optional MediaRecorder
      if (!isSpeechRecognitionSupported()) {
        alert('Speech recognition is not supported. Please use Chrome or Edge.')
        setIsRecording(false)
        isRecordingRef.current = false
        return
      }

      recognitionRef.current = createSpeechRecognition({
        onStart: () => {
          setAvatarState(AVATAR_STATES.LISTENING)
        },
        onResult: ({ final, interim }) => {
          const currentFinal = final || ''
          const fullFinal = (accumulatedTranscriptRef.current + ' ' + currentFinal).trim()
          
          if (currentFinal) {
            setFinalTranscript(fullFinal)
          }
          setLiveTranscript(interim || '')
        },
        onEnd: (final) => {
          if (isRecordingRef.current) {
            // Speech recognition stopped automatically due to silence/timeout. Let's restart it!
            if (final) {
              accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + final).trim()
              setFinalTranscript(accumulatedTranscriptRef.current)
            }
            setLiveTranscript('')
            
            console.log('Speech recognition ended automatically. Restarting in 200ms...')
            setTimeout(() => {
              if (isRecordingRef.current && recognitionRef.current) {
                try {
                  startRecognition(recognitionRef.current)
                } catch (err) {
                  console.error('Failed to restart speech recognition:', err)
                }
              }
            }, 200)
          } else {
            // Intentionally stopped
            if (final) {
              const fullFinal = (accumulatedTranscriptRef.current + ' ' + final).trim()
              setFinalTranscript(fullFinal)
            }
            setLiveTranscript('')
            setAvatarState(AVATAR_STATES.IDLE)
            setIsRecording(false)
            
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop()
            }
          }
        },
        onError: (err) => {
          console.error('Speech recognition error:', err)
          
          const criticalErrors = ['not-allowed', 'audio-capture', 'service-not-allowed', 'network']
          if (criticalErrors.includes(err)) {
            isRecordingRef.current = false
            setIsRecording(false)
            setAvatarState(AVATAR_STATES.IDLE)
            
            let errMsg = `Speech recognition error: ${err}`
            if (err === 'not-allowed') {
              errMsg = 'Microphone permission was denied, or the page is not running over a secure connection (HTTPS). On mobile devices, browsers restrict microphone access and speech APIs to secure origins (HTTPS/localhost). Please enable permissions and use HTTPS.'
            } else if (err === 'audio-capture') {
              errMsg = 'Could not access your microphone. Please check if another application or browser tab is using it.'
            } else if (err === 'network') {
              errMsg = 'Network connection lost. Speech recognition requires an active internet connection.'
            }
            alert(errMsg)
          }
        },
      })

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaStreamRef.current = stream
          const mediaRecorder = new MediaRecorder(stream)
          mediaRecorderRef.current = mediaRecorder
          audioChunksRef.current = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            const url = URL.createObjectURL(audioBlob)
            setAudioUrl(url)
            stream.getTracks().forEach(track => track.stop())
            mediaStreamRef.current = null
          }

          mediaRecorder.start()
          startRecognition(recognitionRef.current)
        })
        .catch(err => {
          console.error('Failed to start audio recording:', err)
          startRecognition(recognitionRef.current)
        })
    }
  }, [resetAnswerTimer, isMobile, setFinalTranscript, setLiveTranscript, setAudioUrl, setIsRecording, setAvatarState, setPhase])

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false
    setIsRecording(false)
    setAvatarState(AVATAR_STATES.IDLE)
    
    if (isMobile) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    } else {
      stopRecognition(recognitionRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
        } catch (e) {
          console.error(e)
        }
        mediaStreamRef.current = null
      }
    }
  }, [setIsRecording, setAvatarState, isMobile])

  const handleReRecord = useCallback(() => {
    setFinalTranscript('')
    setLiveTranscript('')
    setAudioUrl(null)
    stopSpeaking()
    accumulatedTranscriptRef.current = ''
  }, [setFinalTranscript, setLiveTranscript, setAudioUrl])

  const handleEndInterview = useCallback(async () => {
    setPhase(INTERVIEW_PHASES.ENDING)
    setAvatarState(AVATAR_STATES.THINKING)
    try {
      const token = await getAuthToken()
      await endInterview(token, sessionId)
      navigate(`/reports/${sessionId}`)
      // Bust the cache in background so dashboard/history/reports are fresh when user returns
      invalidateCache().catch(() => {})
    } catch (err) {
      console.error('End interview error:', err)
      navigate(`/reports/${sessionId}`)
      invalidateCache().catch(() => {})
    }
  }, [sessionId, navigate, getAuthToken, setPhase, setAvatarState, invalidateCache])

  const handleSubmitAnswer = useCallback(async () => {
    const transcript = finalTranscript || liveTranscript
    if (!transcript || transcript.trim().length < 3) return

    const duration = answerStartTime.current
      ? (Date.now() - answerStartTime.current) / 1000
      : null

    setSubmitting(true)
    setPhase(INTERVIEW_PHASES.PROCESSING)
    setAvatarState(AVATAR_STATES.THINKING)

    try {
      const token = await getAuthToken()

      // Submit answer and get evaluation
      const result = await submitAnswer(token, {
        sessionId,
        questionId: currentQuestionId,
        transcript: transcript.trim(),
        duration,
      })

      setFeedback(result)
      setQuestionLog(prev => [...prev, {
        question: currentQuestion,
        answer: transcript,
        feedback: result,
        type: followUpCount > 0 ? 'followup' : 'main',
      }])

      // Check for follow-up
      if (canFollowUp) {
        const followUpResult = await getFollowUp(token, {
          sessionId,
          questionId: currentQuestionId,
          userAnswer: transcript,
          followUpCount,
        })

        if (followUpResult.has_follow_up) {
          setPhase(INTERVIEW_PHASES.FEEDBACK)
          setAvatarState(AVATAR_STATES.IDLE)
          // Store follow-up to show after feedback
          interview._pendingFollowUp = followUpResult
        } else {
          setPhase(INTERVIEW_PHASES.FEEDBACK)
          setAvatarState(AVATAR_STATES.IDLE)
          interview._pendingFollowUp = null
        }
      } else {
        setPhase(INTERVIEW_PHASES.FEEDBACK)
        setAvatarState(AVATAR_STATES.IDLE)
        interview._pendingFollowUp = null
      }
    } catch (err) {
      console.error('Submit error:', err)
      setPhase(INTERVIEW_PHASES.RECORDING)
      setAvatarState(AVATAR_STATES.LISTENING)
    } finally {
      setSubmitting(false)
    }
  }, [finalTranscript, liveTranscript, sessionId, currentQuestionId, followUpCount, canFollowUp, getAuthToken, setPhase, setAvatarState, setFeedback, currentQuestion, interview])

  const handleNext = useCallback(async () => {
    const token = await getAuthToken()
    setFeedback(null)
    setAudioUrl(null)

    // Check if there's a pending follow-up
    const pendingFollowUp = interview._pendingFollowUp
    interview._pendingFollowUp = null

    if (pendingFollowUp?.has_follow_up) {
      // Ask follow-up
      setFollowUp({
        question: pendingFollowUp.follow_up_question,
        questionId: pendingFollowUp.follow_up_question_id,
      })
      setFinalTranscript('')
      setLiveTranscript('')
      return
    }

    // Get next main question
    setLoadingNext(true)
    setAvatarState(AVATAR_STATES.THINKING)
    try {
      const result = await getNextQuestion(token, sessionId)
      if (!result.has_next) {
        // End interview
        setLoadingNext(false)
        await handleEndInterview()
        return
      }
      setQuestion({
        question: result.question_text,
        questionId: result.question_id,
        questionNumber: result.question_number,
      })
      setFinalTranscript('')
      setLiveTranscript('')
    } catch (err) {
      console.error('Next question error:', err)
    } finally {
      setLoadingNext(false)
    }
  }, [sessionId, setAudioUrl, setFeedback, interview, setFollowUp, setFinalTranscript, setLiveTranscript, setAvatarState, handleEndInterview, setQuestion, getAuthToken])

  const handleExit = () => {
    shouldSpeakRef.current = false
    stopSpeaking()
    setAvatarState(AVATAR_STATES.IDLE)
    isRecordingRef.current = false
    abortRecognition(recognitionRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    resetInterview()
    navigate('/dashboard')
  }

  const diffBadge = { easy: 'easy', medium: 'medium', hard: 'hard' }

  if (!sessionId) return null

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-white">Interview in Progress</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={diffBadge[difficulty?.toLowerCase()] || 'default'}>{difficulty}</Badge>
          <Badge variant="primary">{topic}</Badge>
          <span className="text-gray-400 text-sm font-mono bg-dark-600 px-3 py-1 rounded-lg">{totalFormatted}</span>
          {sessionId && (phase === INTERVIEW_PHASES.QUESTION || phase === INTERVIEW_PHASES.RECORDING) && (
            <button
              onClick={() => speakQuestion(currentQuestion)}
              className="px-3 py-1 rounded-lg bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <Volume2 size={14} />
              Re-listen
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-white/5"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => { shouldSpeakRef.current = false; stopSpeaking(); setAvatarState(AVATAR_STATES.IDLE); setExitConfirm(true); }}
            className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-4 lg:min-h-[calc(100vh-140px)]">
          {/* Left: Avatar Column */}
          <div className="lg:w-[42%] flex-none bg-dark-800 p-4 flex flex-col gap-4 rounded-2xl lg:min-h-[80vh]">
            <div className="relative w-full h-[60vw] lg:h-[500px] rounded-2xl overflow-hidden">
              <AvatarPanel avatarState={avatarState} />
            </div>

            {/* Question progress sidebar */}
            <div className="bg-dark-700/60 border border-white/8 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Question {questionNumber} of {totalQuestions}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: totalQuestions }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      i + 1 < questionNumber
                        ? 'bg-green-600/30 text-green-400 border border-green-500/30'
                        : i + 1 === questionNumber
                        ? 'bg-primary-600/40 text-primary-300 border border-primary-500/40 scale-110'
                        : 'bg-dark-600 text-gray-600 border border-white/5'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Question + Recording */}
          <div className="flex-1 flex flex-col gap-4 lg:min-h-[80vh]">
            {/* Current Question */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {followUpCount > 0 ? `Follow-Up ${followUpCount}` : `Question ${questionNumber}`}
                </span>
                {followUpCount > 0 && (
                  <Badge variant="warning">Follow-up</Badge>
                )}
              </div>
              <p className="text-white text-base sm:text-lg font-medium leading-relaxed">
                {currentQuestion || 'Loading question...'}
              </p>
            </Card>

            {/* Phase: ENDING */}
            {phase === INTERVIEW_PHASES.ENDING && (
              <Card className="p-6 text-center">
                <div className="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white font-bold text-lg">Generating Your Report...</p>
                <p className="text-gray-400 text-sm mt-2">Analyzing your performance across all questions</p>
              </Card>
            )}

            {/* Transcript */}
            {phase !== INTERVIEW_PHASES.ENDING && !loadingNext && (
              <TranscriptPanel
                liveTranscript={liveTranscript}
                finalTranscript={finalTranscript}
                isRecording={isRecording}
              />
            )}

            {/* Audio Player for recorded speech */}
            {audioUrl && phase !== INTERVIEW_PHASES.ENDING && !loadingNext && (
              <div className="bg-dark-700/60 border border-white/8 rounded-2xl p-4 flex flex-col gap-2 animate-slide-up">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Speech Recording</span>
                <audio src={audioUrl} controls className="w-full mt-1 accent-primary-600 rounded-lg" />
              </div>
            )}

            {/* Recording Controls */}
            {phase !== INTERVIEW_PHASES.ENDING && !loadingNext && (
              <div className="mt-auto pt-2">
                {phase === INTERVIEW_PHASES.RECORDING && !transcribing && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">Answer timer: {answerFormatted}</span>
                  </div>
                )}
                {transcribing ? (
                  <Card className="p-4 flex items-center justify-center gap-3 border border-white/15 bg-primary-600/5 text-primary-300">
                    <Loader2 size={18} className="animate-spin text-primary-500" />
                    <span className="text-sm font-semibold">Transcribing audio using AI...</span>
                  </Card>
                ) : (
                  <RecordingControls
                    isRecording={isRecording}
                    hasTranscript={!!(finalTranscript || liveTranscript)}
                    onStart={startRecording}
                    onStop={stopRecording}
                    onReRecord={handleReRecord}
                    onSubmit={handleSubmitAnswer}
                    submitting={submitting}
                    disabled={(phase !== INTERVIEW_PHASES.RECORDING && phase !== INTERVIEW_PHASES.QUESTION) || submitting}
                    phase={phase}
                  />
                )}
              </div>
            )}

            {/* Loading Next Question */}
            {loadingNext && (
              <Card className="p-6 text-center animate-pulse">
                <div className="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white font-bold text-lg">Loading Next Question...</p>
                <p className="text-gray-400 text-sm mt-2">Generating and fetching the next AI question</p>
              </Card>
            )}
          </div>
        </div>

        {/* Row 2 — full width feedback panel */}
        {phase === INTERVIEW_PHASES.FEEDBACK && lastFeedback && !loadingNext && (
          <div className="w-full animate-slide-up">
            <FeedbackPanel
              feedback={lastFeedback}
              onNext={handleNext}
              nextLabel={
                interview._pendingFollowUp?.has_follow_up
                  ? 'Answer Follow-Up'
                  : questionNumber >= totalQuestions
                  ? 'Finish Interview'
                  : 'Next Question'
              }
            />
          </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {exitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="p-8 max-w-sm w-full text-center">
            <p className="text-white font-bold text-xl mb-3">Exit Interview?</p>
            <p className="text-gray-400 text-sm mb-8">
              If you exit now, your progress will not be saved. Are you sure?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setExitConfirm(false)}
                className="px-6 py-3 bg-dark-600 border border-white/10 text-white rounded-xl font-semibold hover:bg-dark-500 transition-colors"
              >
                Continue Interview
              </button>
              <button
                onClick={handleExit}
                className="px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
              >
                Exit
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
