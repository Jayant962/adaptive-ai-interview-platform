/**
 * Speech Service
 * Browser Web Speech API - Speech Recognition (STT) + Speech Synthesis (TTS)
 * No external libraries needed - built into modern browsers.
 */

// ─────────────────────────────────────────────
// SPEECH RECOGNITION (Speech-to-Text)
// ─────────────────────────────────────────────

let recognition = null

export function isSpeechRecognitionSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function createSpeechRecognition({ onResult, onEnd, onError, onStart }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    onError?.('Speech recognition is not supported in this browser. Please use Chrome.')
    return null
  }

  recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1

  let finalTranscript = ''
  let interimTranscript = ''

  recognition.onstart = () => {
    finalTranscript = ''
    interimTranscript = ''
    onStart?.()
  }

  recognition.onresult = (event) => {
    interimTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' '
      } else {
        interimTranscript += transcript
      }
    }

    onResult?.({
      final: finalTranscript.trim(),
      interim: interimTranscript,
      combined: (finalTranscript + interimTranscript).trim(),
    })
  }

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') return // Ignore no-speech errors
    if (event.error === 'aborted') return    // Ignore intentional stops
    onError?.(event.error)
  }

  recognition.onend = () => {
    onEnd?.(finalTranscript.trim())
  }

  return recognition
}

export function startRecognition(recognitionInstance) {
  try {
    recognitionInstance?.start()
  } catch (e) {
    // Already started - ignore
  }
}

export function stopRecognition(recognitionInstance) {
  try {
    recognitionInstance?.stop()
  } catch (e) {
    // Already stopped - ignore
  }
}

export function abortRecognition(recognitionInstance) {
  try {
    recognitionInstance?.abort()
  } catch (e) {
    // Already aborted - ignore
  }
}

// ─────────────────────────────────────────────
// SPEECH SYNTHESIS (Text-to-Speech)
// ─────────────────────────────────────────────

let currentAudio = null

export function isSpeechSynthesisSupported() {
  return true
}

export function speakText(text, { onStart, onEnd, onError } = {}) {
  // Cancel any current speech
  stopSpeaking()

  if (!text || !text.trim()) {
    onError?.('No text provided')
    return
  }

  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const API_URL = rawApiUrl.replace(/\/$/, '')
  const url = `${API_URL}/api/interview/tts?text=${encodeURIComponent(text.trim())}`

  const audio = new Audio(url)
  currentAudio = audio

  audio.onplay = () => {
    onStart?.()
  }

  audio.onended = () => {
    currentAudio = null
    onEnd?.()
  }

  audio.onerror = (e) => {
    console.error('Edge TTS playback error:', e)
    currentAudio = null
    onError?.(e)
  }

  audio.play().catch(err => {
    console.error('Audio play failed:', err)
    currentAudio = null
    onError?.(err)
    onEnd?.() // trigger onEnd so flow doesn't get stuck if play is blocked
  })
}

export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause()
    } catch (e) {
      console.error('Error pausing audio:', e)
    }
    currentAudio = null
  }
}

export function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused
}

// Preload voices (legacy fallback - resolve instantly)
export function loadVoices() {
  return Promise.resolve([])
}
