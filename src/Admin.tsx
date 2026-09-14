import { useEffect, useState } from 'react'
import { formatTime, useGameState } from './useGame'
import { LETTERS, RESULT_COLORS } from './letters'

const PLAYERS = ['Jugador 1', 'Jugador 2'] as const

const RESULTS: { key: LetterResult; label: string }[] = [
  { key: 'correcta', label: 'Correcta' },
  { key: 'incorrecta', label: 'Incorrecta' },
  { key: 'pasa', label: 'Pasa' },
]

function Admin() {
  const state = useGameState()
  const [minutes, setMinutes] = useState('5')

  useEffect(() => {
    if (state) setMinutes(String(state.startMinutes))
  }, [state])

  if (!state) {
    return <div className="screen-wrap">Cargando estado...</div>
  }

  const playing = state.gameStarted && !state.gameOver
  const currentPlayer = playing && state.currentTurn ? state.currentTurn : null
  const currentLetterIndex = currentPlayer ? state.players[currentPlayer].currentIndex : -1
  const remaining = playing ? state.remainingMs : null
  const lowTime = remaining !== null && remaining <= 30000

  return (
    <div className="admin-screen">
      <h1 className="admin-title">Panel de administración</h1>

      <section className="admin-card">
        <h2>Jugadores</h2>
        <ul className="player-status">
          {PLAYERS.map((player) => (
            <li key={player} className={`player-row ${state.connected[player] ? 'connected' : 'waiting'}`}>
              <span className="player-dot" />
              <span>{player}</span>
              <span className="player-state">{state.connected[player] ? 'Conectado' : 'Sin conectar'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Inicio</h2>
        <div className="minutes-control">
          <label htmlFor="start-minutes">Minutos del contador de cada turno</label>
          <div className="minutes-row">
            <input
              id="start-minutes"
              type="number"
              min={1}
              max={120}
              value={minutes}
              disabled={state.gameStarted}
              onChange={(event) => {
                setMinutes(event.target.value)
                window.roscaGame.setStartMinutes(Number(event.target.value))
              }}
            />
            <span>min</span>
          </div>
        </div>
        <div className="admin-actions">
          <button onClick={() => window.roscaGame.startGame()} disabled={state.gameStarted}>
            Iniciar juego
          </button>
          <button
            className="danger"
            onClick={() => {
              setMinutes(String(state.startMinutes))
              window.roscaGame.reset()
            }}
          >
            Reiniciar
          </button>
        </div>
        <p className="hint">
          El juego arranca apenas presionás «Iniciar juego». Cada jugador tiene {state.startMinutes} min acumulados para
          todos sus turnos; si su contador llega a 0:00, ese jugador pierde.
        </p>
      </section>

      <section className="admin-card">
        <h2>Turnos</h2>
        <div className="turn-banner">
          {state.gameOver ? (
            <>
              <span className="turn-winner">{state.winner ? `¡${state.winner} ganó!` : 'Juego terminado'}</span>
              <span className="turn-idle">Juego terminado</span>
            </>
          ) : currentPlayer ? (
            <>
              <span className="turn-player">Turno actual: {currentPlayer}</span>
              <span className="turn-letter">
                Letra: {currentLetterIndex >= 0 ? LETTERS[currentLetterIndex] : '–'}
              </span>
            </>
          ) : (
            <span className="turn-idle">El juego aún no inicia</span>
          )}
        </div>

        {playing && (
          <div className={`turn-timer${lowTime ? ' danger' : ''}`}>
            <span className="turn-timer-label">Tiempo restante del turno</span>
            <span className="turn-timer-value">{remaining !== null ? formatTime(remaining) : '–'}</span>
          </div>
        )}

        <div className="result-actions">
          {RESULTS.map((result) => (
            <button
              key={result.key}
              className="result-btn"
              style={{ background: RESULT_COLORS[result.key] }}
              disabled={!playing || !currentPlayer}
              onClick={() => window.roscaGame.markResult(result.key)}
            >
              {result.label}
            </button>
          ))}
        </div>

        {PLAYERS.map((player) => {
          const progress = state.players[player]
          const answeredCount = progress.letterStates.filter((status) => status !== null).length
          const isTurn = currentPlayer === player
          return (
            <div key={player} className={`player-wheel-row${isTurn ? ' is-turn' : ''}`}>
              <div className="wheel-head">
                <span className={`player-lbl${isTurn ? ' turn-active' : ''}`}>{player}</span>
                <span className="player-meta">
                  <span className={`player-time${progress.timeLeftMs <= 30000 ? ' time-low' : ''}`}>
                    ⏱ {formatTime(progress.timeLeftMs)}
                  </span>
                  <span className="player-progress">
                    {answeredCount}/{LETTERS.length}
                  </span>
                </span>
              </div>
              <div className="letter-chips">
                {LETTERS.map((letter, index) => {
                  const status = progress.letterStates[index]
                  const wasPassed = progress.passed[index]
                  const displayStatus = status ?? (wasPassed ? ('pasa' as const) : null)
                  const isCurrent = isTurn && progress.currentIndex === index
                  return (
                    <button
                      key={letter}
                      className={`chip${displayStatus ? ' chip-filled' : ' chip-empty'}${isCurrent ? ' chip-current' : ''}`}
                      style={displayStatus ? { background: RESULT_COLORS[displayStatus] } : undefined}
                      disabled={!playing || !isTurn || status !== null}
                      title={status ? `${letter}: ${status}` : wasPassed ? `${letter}: pasada` : `Elegir letra ${letter}`}
                      onClick={() => window.roscaGame.setCurrentLetter(player, index)}
                    >
                      {letter}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

export default Admin