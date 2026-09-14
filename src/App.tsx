import './App.css'
import Rosca from './Rosca'
import Admin from './Admin'
import { formatTime, useGameState } from './useGame'
import { LETTERS } from './letters'

const role = window.roscaWindow?.role ?? 'Administrador'
const isPlayer = role === 'Jugador 1' || role === 'Jugador 2'

function getOther(player: string) {
  return player === 'Jugador 1' ? 'Jugador 2' : 'Jugador 1'
}

function PlayerScreen({ player }: { player: string }) {
  const state = useGameState()

  let middle
  if (!state) {
    middle = <p className="center-subtitle">Conectando...</p>
  } else if (!state.connected[player]) {
    middle = (
      <>
        <span className="center-badge">{player}</span>
        <h2 className="center-title">¿Listo para jugar?</h2>
        <p className="center-subtitle">Presioná el botón para conectarte a la rosca</p>
        <button className="connect-button" onClick={() => window.roscaGame.connect(player)}>
          Conectarse
        </button>
      </>
    )
  } else if (!state.gameStarted) {
    middle = (
      <>
        <span className="center-badge">{player} conectado</span>
        <div className="waiting-spinner" />
        <p className="waiting-hint">Esperando que el admin inicie el juego...</p>
      </>
    )
  } else if (state.gameOver) {
    const won = state.winner === player
    middle = (
      <>
        <span className="center-badge">Juego terminado</span>
        <h2 className="center-title">{won ? '¡Ganaste!' : 'Perdiste'}</h2>
        <p className="waiting-hint">{won ? `Le ganaste a ${getOther(player)}.` : `${state.winner ?? 'El rival'} ganó la partida.`}</p>
      </>
    )
  } else {
    const progress = state.players[player]
    const answeredCount = progress.letterStates.filter((status) => status !== null).length
    const isMyTurn = state.currentTurn === player
    const remaining = progress.timeLeftMs
    const lowTime = remaining <= 30000
    middle = (
      <>
        <span className="center-badge">
          {progress.currentIndex >= 0 ? `Letra ${LETTERS[progress.currentIndex]}` : 'Rosca completa'}
        </span>
        <h2 className="center-title">{isMyTurn ? 'Tu turno' : `Turno de ${getOther(player)}`}</h2>
        <div className={`waiting-countdown${lowTime ? ' danger' : ''}`}>{formatTime(remaining)}</div>
        <p className="waiting-hint">Tu tiempo propio: {isMyTurn ? 'se descuenta ahora' : 'se pausa hasta tu turno'}.</p>
        <p className="waiting-hint">Letras resueltas: {answeredCount}/{LETTERS.length}</p>
      </>
    )
  }

  let letterStates: (LetterResult | null)[] | undefined
  let passed: boolean[] | undefined
  let currentIndex = -1
  let pulse = false
  if (state && state.gameStarted) {
    letterStates = state.players[player].letterStates
    passed = state.players[player].passed
    if (!state.gameOver) {
      currentIndex = state.players[player].currentIndex
      pulse = state.currentTurn === player
    }
  }

  return <Rosca middle={middle} letterStates={letterStates} passed={passed} currentIndex={currentIndex} pulseCurrent={pulse} />
}

function App() {
  if (!isPlayer) {
    return <Admin />
  }

  return <PlayerScreen player={role} />
}

export default App