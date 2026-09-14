import type { ReactNode } from 'react'
import { LETTERS, RESULT_COLORS } from './letters'

const NEUTRAL = '#1e4fb8'

const RADIUS = 310
const CENTER = 360

interface PositionedLetter {
  letter: string
  x: number
  y: number
}

const POSITIONS: PositionedLetter[] = LETTERS.map((letter, index) => {
  const angle = (index / LETTERS.length) * 2 * Math.PI - Math.PI / 2
  return {
    letter,
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  }
})

function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + Math.round(2.55 * percent)
  let g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent)
  let b = (num & 0x0000ff) + Math.round(2.55 * percent)
  r = Math.min(255, r)
  g = Math.min(255, g)
  b = Math.min(255, b)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function getContrastColor(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = num >> 16
  const g = (num >> 8) & 0x00ff
  const b = num & 0x0000ff
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111' : '#fff'
}

interface RoscaProps {
  middle?: ReactNode
  letterStates?: (LetterResult | null)[]
  passed?: boolean[]
  currentIndex?: number
  pulseCurrent?: boolean
}

function Rosca({ middle, letterStates, passed, currentIndex = -1, pulseCurrent = false }: RoscaProps) {
  return (
    <div className="rosca-screen">
      <div className="circle-wrap">
        {POSITIONS.map((pos, index) => {
          const status = letterStates ? letterStates[index] : null
          const wasPassed = passed ? passed[index] : false
          const base = status ? RESULT_COLORS[status] : wasPassed ? RESULT_COLORS.pasa : NEUTRAL
          const isCurrent = index === currentIndex
          return (
            <div
              key={pos.letter}
              className={`letter${isCurrent ? (pulseCurrent ? ' current-turn' : ' current') : ''}`}
              style={{
                left: pos.x,
                top: pos.y,
                background: `radial-gradient(circle at 30% 30%, ${lighten(base, 25)}, ${base})`,
                color: getContrastColor(base),
              }}
            >
              {pos.letter}
            </div>
          )
        })}
        {middle !== undefined && <div className="rosca-center">{middle}</div>}
      </div>
    </div>
  )
}

export default Rosca