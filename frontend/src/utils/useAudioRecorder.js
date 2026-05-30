import { useState, useRef } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob]     = useState(null)
  const [recError, setRecError]       = useState('')
  const recorderRef = useRef(null)
  const chunksRef   = useRef([])

  const startRecording = async () => {
    setRecError('')
    setAudioBlob(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Pick best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      chunksRef.current   = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(100)
      setIsRecording(true)
    } catch {
      setRecError('Microphone access denied. Please allow microphone permission and try again.')
    }
  }

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const resetRecorder = () => {
    setAudioBlob(null)
    setRecError('')
    setIsRecording(false)
  }

  return { isRecording, audioBlob, recError, startRecording, stopRecording, resetRecorder }
}
