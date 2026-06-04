import React, { createContext, useContext, useReducer, useCallback } from 'react'

const InterviewContext = createContext(null)

// Avatar states
export const AVATAR_STATES = {
  IDLE: 'idle',
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  THINKING: 'thinking',
}

// Interview phases
export const INTERVIEW_PHASES = {
  SETUP: 'setup',
  STARTING: 'starting',
  QUESTION: 'question',        // Avatar speaking question
  RECORDING: 'recording',      // User answering
  PROCESSING: 'processing',    // Evaluating answer
  FEEDBACK: 'feedback',        // Showing feedback
  FOLLOW_UP: 'follow_up',      // Follow-up question
  ENDING: 'ending',            // Generating report
  COMPLETE: 'complete',        // Interview done
}

const initialState = {
  sessionId: null,
  topic: '',
  difficulty: '',
  phase: INTERVIEW_PHASES.SETUP,
  avatarState: AVATAR_STATES.IDLE,

  // Questions
  currentQuestion: null,
  currentQuestionId: null,
  questionNumber: 1,
  totalQuestions: 0,
  questionHistory: [],

  // Follow-ups
  followUpCount: 0,
  maxFollowUps: { easy: 1, medium: 2, hard: 3 },
  currentParentQuestionId: null,

  // Transcript
  liveTranscript: '',
  finalTranscript: '',

  // Feedback
  lastFeedback: null,

  // Timer
  elapsedSeconds: 0,

  // Error
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        topic: action.payload.topic,
        difficulty: action.payload.difficulty,
        totalQuestions: action.payload.totalQuestions,
      }
    case 'SET_QUESTION':
      return {
        ...state,
        currentQuestion: action.payload.question,
        currentQuestionId: action.payload.questionId,
        questionNumber: action.payload.questionNumber || state.questionNumber,
        followUpCount: 0,
        currentParentQuestionId: action.payload.questionId,
        liveTranscript: '',
        finalTranscript: '',
        lastFeedback: null,
      }
    case 'SET_FOLLOW_UP':
      return {
        ...state,
        currentQuestion: action.payload.question,
        currentQuestionId: action.payload.questionId,
        followUpCount: state.followUpCount + 1,
        liveTranscript: '',
        finalTranscript: '',
      }
    case 'SET_PHASE':
      return { ...state, phase: action.payload }
    case 'SET_AVATAR_STATE':
      return { ...state, avatarState: action.payload }
    case 'SET_LIVE_TRANSCRIPT':
      return { ...state, liveTranscript: action.payload }
    case 'SET_FINAL_TRANSCRIPT':
      return { ...state, finalTranscript: action.payload, liveTranscript: '' }
    case 'SET_FEEDBACK':
      return { ...state, lastFeedback: action.payload }
    case 'ADD_TO_HISTORY':
      return {
        ...state,
        questionHistory: [
          ...state.questionHistory,
          action.payload,
        ],
      }
    case 'SET_ELAPSED':
      return { ...state, elapsedSeconds: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setSession = useCallback((data) => dispatch({ type: 'SET_SESSION', payload: data }), [])
  const setQuestion = useCallback((data) => dispatch({ type: 'SET_QUESTION', payload: data }), [])
  const setFollowUp = useCallback((data) => dispatch({ type: 'SET_FOLLOW_UP', payload: data }), [])
  const setPhase = useCallback((phase) => dispatch({ type: 'SET_PHASE', payload: phase }), [])
  const setAvatarState = useCallback((s) => dispatch({ type: 'SET_AVATAR_STATE', payload: s }), [])
  const setLiveTranscript = useCallback((t) => dispatch({ type: 'SET_LIVE_TRANSCRIPT', payload: t }), [])
  const setFinalTranscript = useCallback((t) => dispatch({ type: 'SET_FINAL_TRANSCRIPT', payload: t }), [])
  const setFeedback = useCallback((f) => dispatch({ type: 'SET_FEEDBACK', payload: f }), [])
  const addToHistory = useCallback((item) => dispatch({ type: 'ADD_TO_HISTORY', payload: item }), [])
  const setElapsed = useCallback((s) => dispatch({ type: 'SET_ELAPSED', payload: s }), [])
  const setError = useCallback((e) => dispatch({ type: 'SET_ERROR', payload: e }), [])
  const resetInterview = useCallback(() => dispatch({ type: 'RESET' }), [])

  const maxFollowUps = state.maxFollowUps[state.difficulty?.toLowerCase()] || 1
  const canFollowUp = state.followUpCount < maxFollowUps

  return (
    <InterviewContext.Provider value={{
      ...state,
      maxFollowUps,
      canFollowUp,
      setSession,
      setQuestion,
      setFollowUp,
      setPhase,
      setAvatarState,
      setLiveTranscript,
      setFinalTranscript,
      setFeedback,
      addToHistory,
      setElapsed,
      setError,
      resetInterview,
    }}>
      {children}
    </InterviewContext.Provider>
  )
}

export function useInterview() {
  const ctx = useContext(InterviewContext)
  if (!ctx) throw new Error('useInterview must be used inside InterviewProvider')
  return ctx
}
