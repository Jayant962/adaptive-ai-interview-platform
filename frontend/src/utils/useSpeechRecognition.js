import { useState, useRef, useCallback } from 'react'

// ── Browser detection helpers ──────────────────────────────────────────────
function getSpeechAPI() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition
      || window.webkitSpeechRecognition   // Chrome, Brave, Opera, old Edge
      || window.mozSpeechRecognition      // Firefox (flag)
      || window.msSpeechRecognition       // IE (legacy)
      || null
}

function getBrowserName() {
  const ua = navigator.userAgent
  if (ua.includes('Brave') || navigator.brave) return 'Brave'
  if (ua.includes('Edg/'))   return 'Edge'
  if (ua.includes('OPR/'))   return 'Opera'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari'))  return 'Safari'
  return 'Unknown'
}

function getSupportMessage() {
  const browser = getBrowserName()
  const SR = getSpeechAPI()
  if (SR) return null   // supported — no message needed

  if (browser === 'Firefox') {
    return 'Firefox requires speech recognition to be enabled manually. Go to about:config and set media.webspeech.recognition.enable = true, then reload. Alternatively, use Chrome or Edge.'
  }
  if (browser === 'Brave') {
    return 'Brave browser may block speech recognition. Click the Brave Shield icon (top-right) → disable shields for localhost, then reload.'
  }
  return 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave (with shields off).'
}

export function useSpeechRecognition() {
  const SR = getSpeechAPI()

  const [isListening,      setIsListening]      = useState(false)
  const [transcript,       setTranscript]       = useState('')
  const [stableTranscript, setStableTranscript] = useState('')
  const [interimText,      setInterimText]      = useState('')
  const [sttError,         setSttError]         = useState('')
  const [isSupported]      = useState(() => !!SR)
  const [supportMessage]   = useState(() => getSupportMessage())

  const recognitionRef = useRef(null)
  const finalRef       = useRef('')
  const interimRef     = useRef('')
  const shouldRunRef   = useRef(false)
  const stoppingRef    = useRef(false)
  const retryRef       = useRef(0)
  const MAX_RETRIES    = 5

  const _startRec = useCallback(() => {
    const SpeechAPI = getSpeechAPI()
    if (!SpeechAPI) return

    const rec = new SpeechAPI()
    rec.lang            = 'en-US'
    rec.continuous      = true
    rec.interimResults  = true
    rec.maxAlternatives = 1

    rec.onstart = () => {
      retryRef.current = 0
      setSttError('')
    }

    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalRef.current  += chunk + ' '
          interimRef.current = ''
        } else {
          interim += chunk
        }
      }
      interimRef.current = interim
      const live = (finalRef.current + interim).trim()
      setTranscript(live)
      setInterimText(interim)
    }

    rec.onerror = (event) => {
      if (!shouldRunRef.current && !stoppingRef.current) return

      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied': {
          const browser = getBrowserName()
          let msg = 'Microphone access denied. '
          if (browser === 'Brave') {
            msg += 'In Brave, click the Brave Shield icon → disable shields for this site → reload.'
          } else if (browser === 'Edge') {
            msg += 'In Edge, click the lock icon in the address bar → allow microphone.'
          } else {
            msg += 'Click the lock icon in the address bar and allow microphone access.'
          }
          setSttError(msg)
          shouldRunRef.current = false
          stoppingRef.current  = false
          setIsListening(false)
          break
        }

        case 'no-speech':
          break  // silence — onend handles restart

        case 'network':
          if (retryRef.current < MAX_RETRIES && shouldRunRef.current) {
            retryRef.current++
            setSttError(`Network issue — retrying (${retryRef.current}/${MAX_RETRIES})…`)
            setTimeout(() => { if (shouldRunRef.current) _startRec() }, 1500)
          } else if (shouldRunRef.current) {
            setSttError('Speech recognition unavailable. Check your internet connection.')
            shouldRunRef.current = false
            setIsListening(false)
          }
          break

        case 'audio-capture':
          setSttError('No microphone found. Please connect a microphone and try again.')
          shouldRunRef.current = false
          setIsListening(false)
          break

        case 'service-not-allowed':
          setSttError('Speech service blocked. Make sure you are on http://localhost:3000 and not a file:// URL.')
          shouldRunRef.current = false
          setIsListening(false)
          break

        default:
          if (retryRef.current < MAX_RETRIES && shouldRunRef.current) {
            retryRef.current++
            setTimeout(() => { if (shouldRunRef.current) _startRec() }, 800)
          }
      }
    }

    rec.onend = () => {
      setInterimText('')

      // Commit any remaining interim into final
      if (interimRef.current.trim()) {
        finalRef.current  += interimRef.current.trim() + ' '
        interimRef.current = ''
      }

      const currentFinal = finalRef.current.trim()

      if (stoppingRef.current) {
        // User clicked Stop — lock in stable transcript
        stoppingRef.current = false
        setTranscript(currentFinal)
        setStableTranscript(currentFinal)
        recognitionRef.current = null
        return
      }

      if (shouldRunRef.current) {
        // Auto-restart (Chrome 60s timeout or silence detection)
        setTimeout(() => { if (shouldRunRef.current) _startRec() }, 150)
      }
    }

    recognitionRef.current = rec
    try { rec.start() } catch { /* already running */ }
  }, [])

  const startListening = useCallback(() => {
    const SpeechAPI = getSpeechAPI()
    if (!SpeechAPI) {
      setSttError(supportMessage || 'Speech recognition not supported in this browser.')
      return
    }
    setSttError('')
    setTranscript('')
    setStableTranscript('')
    setInterimText('')
    finalRef.current     = ''
    interimRef.current   = ''
    retryRef.current     = 0
    shouldRunRef.current = true
    stoppingRef.current  = false
    setIsListening(true)
    _startRec()
  }, [_startRec, supportMessage])

  const stopListening = useCallback(() => {
    shouldRunRef.current = false
    stoppingRef.current  = true
    setIsListening(false)
    setInterimText('')

    // Stop immediately — Chrome flushes pending onresult(isFinal) then onend
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }
  }, [])

  const resetSpeech = useCallback(() => {
    shouldRunRef.current = false
    stoppingRef.current  = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    finalRef.current   = ''
    interimRef.current = ''
    setTranscript('')
    setStableTranscript('')
    setInterimText('')
    setSttError('')
    setIsListening(false)
  }, [])

  return {
    isListening,
    transcript,
    stableTranscript,
    interimText,
    sttError,
    isSupported,
    supportMessage,
    startListening,
    stopListening,
    resetSpeech,
    browserName: getBrowserName(),
  }
}