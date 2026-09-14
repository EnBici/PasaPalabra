/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
type LetterResult = 'correcta' | 'incorrecta' | 'pasa'

interface PlayerProgress {
  letterStates: (LetterResult | null)[]
  passed: boolean[]
  currentIndex: number
  timeLeftMs: number
}

interface GameState {
  connected: Record<string, boolean>
  startMinutes: number
  gameStarted: boolean
  currentTurn: 'Jugador 1' | 'Jugador 2' | null
  lastTickAt: number | null
  gameOver: boolean
  winner: 'Jugador 1' | 'Jugador 2' | null
  players: Record<string, PlayerProgress>
}

interface GameSnapshot extends GameState {
  remainingMs: number
}

interface RoscaGameAPI {
  getState: () => Promise<GameSnapshot>
  connect: (player: string) => void
  disconnect: (player: string) => void
  setStartMinutes: (minutes: number) => void
  startGame: () => void
  reset: () => void
  setCurrentLetter: (player: string, index: number) => void
  markResult: (result: LetterResult) => void
  onStateChange: (listener: (state: GameSnapshot) => void) => () => void
}

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  roscaWindow: { role: string | null }
  roscaGame: RoscaGameAPI
}
