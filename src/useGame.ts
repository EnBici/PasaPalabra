import { useEffect, useState } from 'react'

export function useGameState() {
  const [state, setState] = useState<GameSnapshot | null>(null)

  useEffect(() => {
    let active = true
    void window.roscaGame
      .getState()
      .then((snapshot) => {
        if (active) setState(snapshot)
      })
    const unsubscribe = window.roscaGame.onStateChange((snapshot) => {
      if (active) setState(snapshot)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return state
}

export function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}