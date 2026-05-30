import { useState, useEffect, useRef } from 'react'

export function useTimer(active) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (active) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else {
      clearInterval(ref.current)
    }
    return () => clearInterval(ref.current)
  }, [active])

  const reset = () => setSeconds(0)

  const formatted = () => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0)
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  return { seconds, formatted, reset }
}
