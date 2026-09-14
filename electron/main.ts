import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const WINDOW_ROLES = ['Jugador 1', 'Jugador 2', 'Administrador']
const WINDOW_TITLE = 'PasaPalabra'
const PLAYER_SIZE = { width: 920, height: 840 }
const ADMIN_SIZE = { width: 800, height: 620 }

// ---------------- Game state ----------------

const PLAYER_NAMES = ['Jugador 1', 'Jugador 2'] as const
const LETTER_COUNT = 27

function emptyProgress(): PlayerProgress {
  return {
    letterStates: Array<LetterResult | null>(LETTER_COUNT).fill(null),
    passed: Array<boolean>(LETTER_COUNT).fill(false),
    currentIndex: 0,
    timeLeftMs: 0,
  }
}

function newPlayers(): Record<string, PlayerProgress> {
  const timeLeftMs = state.startMinutes * 60000
  return {
    'Jugador 1': { ...emptyProgress(), timeLeftMs },
    'Jugador 2': { ...emptyProgress(), timeLeftMs },
  }
}

const state: GameState = {
  connected: { 'Jugador 1': false, 'Jugador 2': false },
  startMinutes: 5,
  gameStarted: false,
  currentTurn: null,
  lastTickAt: null,
  gameOver: false,
  winner: null,
  players: { 'Jugador 1': emptyProgress(), 'Jugador 2': emptyProgress() },
}

let gameTimer: ReturnType<typeof setInterval> | null = null

function stopGameTimer() {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

function isPlayerName(name: string): name is (typeof PLAYER_NAMES)[number] {
  return (PLAYER_NAMES as readonly string[]).includes(name)
}

function advanceLetter(player: (typeof PLAYER_NAMES)[number]): boolean {
  const progress = state.players[player]
  const from = progress.currentIndex + 1
  let next = progress.letterStates.findIndex((status, index) => status === null && index >= from)
  if (next === -1) next = progress.letterStates.findIndex((status) => status === null)
  progress.currentIndex = next
  return next === -1
}

function switchTurn() {
  state.currentTurn = state.currentTurn === 'Jugador 1' ? 'Jugador 2' : 'Jugador 1'
}

function snapshot(): GameSnapshot {
  let remainingMs = state.startMinutes * 60000
  if (state.gameStarted && !state.gameOver && state.currentTurn !== null) {
    const progress = state.players[state.currentTurn]
    const base = state.lastTickAt !== null ? state.lastTickAt : Date.now()
    remainingMs = Math.max(0, progress.timeLeftMs - (Date.now() - base))
  } else if (state.currentTurn !== null) {
    remainingMs = state.players[state.currentTurn].timeLeftMs
  }
  return { ...state, remainingMs }
}

function broadcast() {
  const data = snapshot()
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('rosca:state-updated', data)
  })
}

function startGame() {
  if (state.gameStarted) return
  state.gameStarted = true
  state.gameOver = false
  state.winner = null
  state.currentTurn = 'Jugador 1'
  state.lastTickAt = Date.now()
  state.players = newPlayers()
  stopGameTimer()
  gameTimer = setInterval(() => {
    const now = Date.now()
    if (!state.gameOver && state.currentTurn !== null) {
      const last = state.lastTickAt !== null ? state.lastTickAt : now
      const elapsed = now - last
      state.lastTickAt = now
      const progress = state.players[state.currentTurn]
      progress.timeLeftMs = Math.max(0, progress.timeLeftMs - elapsed)
      if (progress.timeLeftMs <= 0) {
        state.gameOver = true
        state.winner = state.currentTurn === 'Jugador 1' ? 'Jugador 2' : 'Jugador 1'
        state.currentTurn = null
        state.lastTickAt = null
        stopGameTimer()
      }
    }
    broadcast()
  }, 1000)
  broadcast()
}

function resetGame() {
  stopGameTimer()
  state.connected = { 'Jugador 1': false, 'Jugador 2': false }
  state.gameStarted = false
  state.currentTurn = null
  state.lastTickAt = null
  state.gameOver = false
  state.winner = null
  state.players = { 'Jugador 1': emptyProgress(), 'Jugador 2': emptyProgress() }
}

function setupIpc() {
  ipcMain.handle('rosca:get-state', () => snapshot())

  ipcMain.on('rosca:connect', (_event: Electron.IpcMainEvent, player: unknown) => {
    if (typeof player === 'string' && isPlayerName(player)) {
      state.connected[player] = true
      broadcast()
    }
  })

  ipcMain.on('rosca:disconnect', (_event: Electron.IpcMainEvent, player: unknown) => {
    if (typeof player === 'string' && isPlayerName(player)) {
      state.connected[player] = false
      broadcast()
    }
  })

  ipcMain.on('rosca:set-start-minutes', (_event: Electron.IpcMainEvent, minutes: unknown) => {
    const value = typeof minutes === 'number' ? minutes : Number(minutes)
    if (!Number.isFinite(value)) return
    state.startMinutes = Math.min(120, Math.max(1, Math.round(value)))
    broadcast()
  })

  ipcMain.on('rosca:start', () => {
    startGame()
  })

  ipcMain.on('rosca:set-current-letter', (_event: Electron.IpcMainEvent, player: unknown, index: unknown) => {
    if (!state.gameStarted || state.gameOver || state.currentTurn === null) return
    if (typeof player !== 'string' || !isPlayerName(player)) return
    if (state.currentTurn !== player) return
    if (typeof index !== 'number' || index < 0 || index >= LETTER_COUNT) return
    if (state.players[player].letterStates[index] !== null) return
    state.players[player].currentIndex = index
    broadcast()
  })

  ipcMain.on('rosca:mark-result', (_event: Electron.IpcMainEvent, result: unknown) => {
    if (!state.gameStarted || state.gameOver || state.currentTurn === null) return
    if (result !== 'correcta' && result !== 'incorrecta' && result !== 'pasa') return
    const player = state.currentTurn
    const progress = state.players[player]
    let completed = false
    if (progress.currentIndex >= 0) {
      if (result === 'pasa') {
        progress.passed[progress.currentIndex] = true
      } else {
        progress.letterStates[progress.currentIndex] = result
        progress.passed[progress.currentIndex] = false
      }
      completed = advanceLetter(player)
    }
    if (completed) {
      state.gameOver = true
      state.winner = player
      state.currentTurn = null
      state.lastTickAt = null
      stopGameTimer()
      broadcast()
      return
    }
    switchTurn()
    state.lastTickAt = Date.now()
    broadcast()
  })

  ipcMain.on('rosca:reset', () => {
    resetGame()
    broadcast()
  })
}

// ---------------- Windows ----------------

const windowsByRole = new Map<string, BrowserWindow>()

function createWindow(role: string, width: number, height: number) {
  const win = new BrowserWindow({
    title: WINDOW_TITLE,
    width,
    height,
    show: false,
    backgroundColor: '#ffffff',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      additionalArguments: [`--window-role=${role}`],
    },
  })

  win.setMenu(null)
  windowsByRole.set(role, win)

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('closed', () => {
    windowsByRole.delete(role)
    if (role !== 'Administrador') {
      state.connected[role] = false
      broadcast()
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function openWindows() {
  WINDOW_ROLES.forEach((role) => {
    const size = role.startsWith('Jugador') ? PLAYER_SIZE : ADMIN_SIZE
    createWindow(role, size.width, size.height)
  })
}

setupIpc()

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.whenReady().then(() => {
    if (windowsByRole.size === 0) openWindows()
  })
})

app.whenReady().then(() => openWindows())