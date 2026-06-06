/**
 * Speech Service
 * Browser Web Speech API - Speech Recognition (STT) + Speech Synthesis (TTS)
 * Compatible with Chrome, Edge, Brave, Firefox, and Safari.
 */

// ─────────────────────────────────────────────
// MIME TYPE NEGOTIATION
// ─────────────────────────────────────────────

export function getBestAudioMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',   // Chrome, Edge, Brave (Chromium)
    'audio/webm',               // Chromium fallback
    'audio/ogg;codecs=opus',    // Firefox
    'audio/mp4;codecs=mp4a',    // Safari 15+
    'audio/mp4',                // Safari older
  ]

  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) {
        return { mimeType: mime, extension: mimeToExtension(mime) }
      }
    } catch (e) { /* ignore */ }
  }

  // Browser will decide — use webm as assumed extension
  return { mimeType: undefined, extension: 'webm' }
}

function mimeToExtension(mime) {
  if (!mime) return 'webm'
  if (mime.startsWith('audio/ogg')) return 'ogg'
  if (mime.startsWith('audio/mp4')) return 'mp4'
  return 'webm'
}

export function createCompatibleMediaRecorder(stream) {
  const { mimeType, extension } = getBestAudioMimeType()
  let mediaRecorder
  try {
    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
  } catch (e) {
    console.warn(`MediaRecorder with mimeType "${mimeType}" failed, using default:`, e)
    mediaRecorder = new MediaRecorder(stream)
    return { mediaRecorder, mimeType: undefined, extension: 'webm' }
  }
  return { mediaRecorder, mimeType, extension }
}

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
    onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
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
    let accumulatedFinal = ''
    let accumulatedInterim = ''

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i]
      const transcript = result[0].transcript
      if (result.isFinal) {
        accumulatedFinal += transcript + ' '
      } else {
        accumulatedInterim += transcript
      }
    }

    finalTranscript = accumulatedFinal
    interimTranscript = accumulatedInterim

    onResult?.({
      final: finalTranscript.trim(),
      interim: interimTranscript,
      combined: (finalTranscript + interimTranscript).trim(),
    })
  }

  recognition.onerror = (event) => {
    // These are safe to ignore — recognition will auto-end and can be restarted
    const ignoredErrors = ['no-speech', 'aborted', 'network']
    if (ignoredErrors.includes(event.error)) {
      // Pass 'network' up so the caller can count failures and decide to fall back
      if (event.error === 'network') {
        onError?.(event.error)
      }
      return
    }
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
    // Already started — ignore
  }
}

export function stopRecognition(recognitionInstance) {
  try {
    recognitionInstance?.stop()
  } catch (e) {
    // Already stopped — ignore
  }
}

export function abortRecognition(recognitionInstance) {
  try {
    recognitionInstance?.abort()
  } catch (e) {
    // Already aborted — ignore
  }
}

// ─────────────────────────────────────────────
// SPEECH SYNTHESIS (Text-to-Speech)
// ─────────────────────────────────────────────

let currentAudio = null
let audioContext = null
let analyser = null
let dataArray = null
let sourceNode = null      // module-level — keeps the Web Audio node alive
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
      dataArray = new Uint8Array(analyser.frequencyBinCount)
      // Connect analyser → destination ONCE (persists across audio elements)
      analyser.connect(audioContext.destination)
    }

    // Disconnect the previous source node before creating a new one.
    // Each HTMLMediaElement can only be passed to createMediaElementSource once,
    // but since speakText() creates a NEW Audio() for every question this is fine.
    if (sourceNode) {
      try { sourceNode.disconnect() } catch (e) {}
      sourceNode = null
    }

    sourceNode = audioContext.createMediaElementSource(audioElement)
    sourceNode.connect(analyser)

    updateVolumeLoop()
  } catch (e) {
    console.warn('Failed to setup Web Audio API analyzer:', e)
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
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
      currentVolume = (sum / dataArray.length) / 128.0
    } else {
      currentVolume = 0
    }
    volumeInterval = requestAnimationFrame(poll)
  }

  poll()
}

export function speakText(text, { onStart, onEnd, onError } = {}) {
  stopSpeaking()

  if (!text || !text.trim()) {
    onError?.('No text provided')
    return
  }

  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const API_URL = rawApiUrl.replace(/\/$/, '')
  const url = `${API_URL}/api/interview/tts?text=${encodeURIComponent(text.trim())}`

  const audio = new Audio()
  // crossOrigin MUST be set before src — required for Web Audio API's
  // createMediaElementSource to work when audio is served from another origin.
  audio.crossOrigin = 'anonymous'
  audio.src = url
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
    console.error('TTS playback error:', e)
    currentAudio = null
    cleanupAudioAnalyzer()
    onError?.(e)
  }

  audio.play().catch(err => {
    console.error('Audio play failed:', err)
    currentAudio = null
    cleanupAudioAnalyzer()
    onError?.(err)
    onEnd?.() // Trigger onEnd so the flow doesn't get stuck
  })
}

export function stopSpeaking() {
  if (currentAudio) {
    try { currentAudio.pause() } catch (e) {}
    currentAudio = null
  }
  cleanupAudioAnalyzer()
}

export function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused
}

export function loadVoices() {
  return Promise.resolve([])
}

export async function transcribeAudioBlob(blob, apiUrl, extension = 'webm') {
  const formData = new FormData()
  formData.append('audio', blob, `audio.${extension}`)

  const cleanApiUrl = apiUrl.replace(/\/$/, '')
  const response = await fetch(`${cleanApiUrl}/api/interview/transcribe`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Transcription failed with HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.transcript
}
