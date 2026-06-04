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

let currentUtterance = null

export function isSpeechSynthesisSupported() {
  return 'speechSynthesis' in window
}

export function speakText(text, { onStart, onEnd, onError, rate = 0.95, pitch = 1.0 } = {}) {
  if (!isSpeechSynthesisSupported()) {
    onError?.('Speech synthesis not supported')
    return
  }

  // Cancel any current speech
  stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate
  utterance.pitch = pitch
  utterance.volume = 1.0
  utterance.lang = 'en-US'

  // Try to use a natural-sounding voice
  const voices = window.speechSynthesis.getVoices()
  const preferredVoice = voices.find(v =>
    v.name.includes('Google US English') ||
    v.name.includes('Microsoft Zira') ||
    v.name.includes('Samantha') ||
    (v.lang === 'en-US' && !v.name.includes('novelty'))
  )
  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  utterance.onstart = () => onStart?.()
  utterance.onend = () => {
    currentUtterance = null
    onEnd?.()
  }
  utterance.onerror = (e) => {
    if (e.error !== 'interrupted') onError?.(e.error)
  }

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking ?? false
}

// Preload voices (some browsers need this)
export function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis?.getVoices()
    if (voices && voices.length > 0) {
      resolve(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices())
      }
    }
  })
}
