/**
 * Speech Service
 * Browser Web Speech API - Speech Recognition (STT) + Speech Synthesis (TTS)
 * Compatible with Chrome, Edge, Brave, Firefox, and Safari.
 */

// ─────────────────────────────────────────────
// MIME TYPE NEGOTIATION
// ─────────────────────────────────────────────

/**
 * Returns the best supported audio MIME type for MediaRecorder, plus the
 * file extension to use when uploading so the backend knows the format.
 */
export function getBestAudioMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',   // Chrome, Edge, Brave (Chromium)
    'audio/webm',               // Chromium fallback (no codec hint)
    'audio/ogg;codecs=opus',    // Firefox
    'audio/mp4;codecs=mp4a',    // Safari 15+
    'audio/mp4',                // Safari older
    '',                         // Let the browser decide (last resort)
  ]

  for (const mime of candidates) {
    if (!mime || MediaRecorder.isTypeSupported(mime)) {
      return { mimeType: mime || undefined, extension: mimeToExtension(mime) }
    }
  }

  return { mimeType: undefined, extension: 'webm' } // should never happen
}

function mimeToExtension(mime) {
  if (!mime) return 'webm'
  if (mime.startsWith('audio/ogg')) return 'ogg'
  if (mime.startsWith('audio/mp4')) return 'mp4'
  return 'webm'
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
    if (event.error === 'no-speech') return  // Ignore no-speech errors
    if (event.error === 'aborted') return     // Ignore intentional stops
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
// Track which audio element is connected to the AudioContext source node
// so we never try to re-connect the same element (throws in non-Chrome browsers).
let connectedAudioElement = null
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

    // Only create a new MediaElementSource if this is a different audio element.
    // Re-connecting the same element throws InvalidStateError in Brave/Edge/Firefox.
    if (connectedAudioElement !== audioElement) {
      try {
        const sourceNode = audioContext.createMediaElementSource(audioElement)
        sourceNode.connect(analyser)
        analyser.connect(audioContext.destination)
        connectedAudioElement = audioElement
      } catch (e) {
        // createMediaElementSource can throw if the element was already connected
        // by a previous AudioContext. Fall back gracefully — volume stays at 0.
        console.warn('AudioContext source already connected, skipping analyzer:', e)
        connectedAudioElement = audioElement // avoid retrying
      }
    }

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
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
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

  const audio = new Audio()
  // Only set crossOrigin when the TTS endpoint is on a different origin.
  // Brave's strict fingerprinting protection can reject crossOrigin on same-origin
  // requests, causing CORS errors even when the server allows it.
  const isSameOrigin = url.startsWith(window.location.origin) ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')
  if (!isSameOrigin) {
    audio.crossOrigin = 'anonymous'
  }
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

/**
 * Creates a MediaRecorder with the best available audio codec for this browser.
 * Returns { mediaRecorder, mimeType, extension } so callers know what format was chosen.
 */
export function createCompatibleMediaRecorder(stream) {
  const { mimeType, extension } = getBestAudioMimeType()

  let mediaRecorder
  try {
    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
  } catch (e) {
    // If the explicit mimeType failed, fall back to browser default
    console.warn(`MediaRecorder with mimeType "${mimeType}" failed, using default:`, e)
    mediaRecorder = new MediaRecorder(stream)
    return { mediaRecorder, mimeType: undefined, extension: 'webm' }
  }

  return { mediaRecorder, mimeType, extension }
}

export async function transcribeAudioBlob(blob, apiUrl, extension = 'webm') {
  const formData = new FormData()
  // Use the actual extension so the backend (Whisper) knows the format
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
