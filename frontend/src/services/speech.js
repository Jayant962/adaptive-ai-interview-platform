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
let audioContext = null
let analyser = null
let dataArray = null
let sourceNode = null
let currentVolume = 0
let volumeInterval = null

export function getSpeechVolume() {
  return currentVolume
}

export function isSpeechSynthesisSupported() {
  return true
}

function setupAudioAnalyzer(audioElement) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!audioContext) {
      audioContext = new AudioContextClass()
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    if (!analyser) {
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
    }

    if (sourceNode) {
      try {
        sourceNode.disconnect()
      } catch (e) {}
    }

    sourceNode = audioContext.createMediaElementSource(audioElement)
    sourceNode.connect(analyser)
    analyser.connect(audioContext.destination)

    updateVolumeLoop()
  } catch (e) {
    console.warn("Failed to setup Web Audio API analyzer:", e)
  }
}

function cleanupAudioAnalyzer() {
  currentVolume = 0
  if (volumeInterval) {
    cancelAnimationFrame(volumeInterval)
    volumeInterval = null
  }
}

function updateVolumeLoop() {
  if (volumeInterval) {
    cancelAnimationFrame(volumeInterval)
  }

  const poll = () => {
    if (!currentAudio || currentAudio.paused) {
      currentVolume = 0
      return
    }

    if (analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      // Scale average volume to 0.0 - 1.0 range
      currentVolume = average / 128.0
    } else {
      currentVolume = 0
    }

    volumeInterval = requestAnimationFrame(poll)
  }

  poll()
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
  audio.crossOrigin = "anonymous"
  currentAudio = audio

  audio.onplay = () => {
    onStart?.()
    setupAudioAnalyzer(audio)
  }

  audio.onended = () => {
    currentAudio = null
    cleanupAudioAnalyzer()
    onEnd?.()
  }

  audio.onerror = (e) => {
    console.error('Edge TTS playback error:', e)
    currentAudio = null
    cleanupAudioAnalyzer()
    onError?.(e)
  }

  audio.play().catch(err => {
    console.error('Audio play failed:', err)
    currentAudio = null
    cleanupAudioAnalyzer()
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
  cleanupAudioAnalyzer()
}

export function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused
}

// Preload voices (legacy fallback - resolve instantly)
export function loadVoices() {
  return Promise.resolve([])
}
