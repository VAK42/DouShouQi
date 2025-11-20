"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { Waves, Castle, Crosshair, RefreshCw, Trophy, Info, Settings } from 'lucide-react'
enum color {
  red = 'red',
  blue = 'blue',
}
enum animalType {
  rat = 1,
  cat = 2,
  dog = 3,
  wolf = 4,
  leopard = 5,
  tiger = 6,
  lion = 7,
  elephant = 8,
}
enum terrainType {
  land = 'land',
  river = 'river',
  trap = 'trap',
  den = 'den',
}
interface piece {
  type: animalType
  color: color
  id: string
}
interface position {
  r: number
  c: number
}
interface move {
  from: position
  to: position
  captured?: piece | null
  pieceType: animalType
  score?: number
}
enum gameMode {
  pvp = 'pvp',
  bot = 'bot',
}
enum gameStatus {
  playing = 'playing',
  redWon = 'red_won',
  blueWon = 'blue_won',
  draw = 'draw',
}
enum difficulty {
  easy = 'Easy',
  medium = 'Medium',
  hard = 'Hard',
}
const boardRows = 9
const boardCols = 7
const animalNames: Record<animalType, string> = {
  [animalType.rat]: 'Rat',
  [animalType.cat]: 'Cat',
  [animalType.dog]: 'Dog',
  [animalType.wolf]: 'Wolf',
  [animalType.leopard]: 'Leopard',
  [animalType.tiger]: 'Tiger',
  [animalType.lion]: 'Lion',
  [animalType.elephant]: 'Elephant',
}
const animalEmojis: Record<animalType, string> = {
  [animalType.rat]: '🐭',
  [animalType.cat]: '🐱',
  [animalType.dog]: '🐶',
  [animalType.wolf]: '🐺',
  [animalType.leopard]: '🐆',
  [animalType.tiger]: '🐯',
  [animalType.lion]: '🦁',
  [animalType.elephant]: '🐘',
}
const tutorialText: Record<animalType, string> = {
  [animalType.rat]: "Rat (1): Can Swim In The River. Captures Elephant! Cannot Capture From River To Land.",
  [animalType.cat]: "Cat (2): Standard Movement.",
  [animalType.dog]: "Dog (3): Standard Movement.",
  [animalType.wolf]: "Wolf (4): Standard Movement.",
  [animalType.leopard]: "Leopard (5): Standard Movement.",
  [animalType.tiger]: "Tiger (6): Can Jump Over Rivers (Horizontal/Vertical) If Path Is Clear.",
  [animalType.lion]: "Lion (7): Can Jump Over Rivers (Horizontal/Vertical) If Path Is Clear.",
  [animalType.elephant]: "Elephant (8): Strongest Animal. Captures All Except Rat.",
}
const getTerrain = (r: number, c: number): terrainType => {
  if (r === 0 && c === 3) return terrainType.den
  if (r === 8 && c === 3) return terrainType.den
  if ((r === 0 && c === 2) || (r === 0 && c === 4) || (r === 1 && c === 3)) return terrainType.trap
  if ((r === 8 && c === 2) || (r === 8 && c === 4) || (r === 7 && c === 3)) return terrainType.trap
  if (r >= 3 && r <= 5 && c >= 1 && c <= 2) return terrainType.river
  if (r >= 3 && r <= 5 && c >= 4 && c <= 5) return terrainType.river
  return terrainType.land
}
const createInitialBoard = (): (piece | null)[][] => {
  const grid = Array(boardRows).fill(null).map(() => Array(boardCols).fill(null))
  const setup = [
    { r: 0, c: 0, type: animalType.lion, color: color.blue },
    { r: 0, c: 6, type: animalType.tiger, color: color.blue },
    { r: 1, c: 1, type: animalType.dog, color: color.blue },
    { r: 1, c: 5, type: animalType.cat, color: color.blue },
    { r: 2, c: 0, type: animalType.rat, color: color.blue },
    { r: 2, c: 2, type: animalType.leopard, color: color.blue },
    { r: 2, c: 4, type: animalType.wolf, color: color.blue },
    { r: 2, c: 6, type: animalType.elephant, color: color.blue },
    { r: 8, c: 6, type: animalType.lion, color: color.red },
    { r: 8, c: 0, type: animalType.tiger, color: color.red },
    { r: 7, c: 5, type: animalType.dog, color: color.red },
    { r: 7, c: 1, type: animalType.cat, color: color.red },
    { r: 6, c: 6, type: animalType.rat, color: color.red },
    { r: 6, c: 4, type: animalType.leopard, color: color.red },
    { r: 6, c: 2, type: animalType.wolf, color: color.red },
    { r: 6, c: 0, type: animalType.elephant, color: color.red },
  ]
  setup.forEach(p => {
    grid[p.r][p.c] = { type: p.type, color: p.color, id: `${p.color}-${p.type}` }
  })
  return grid
}
const isValidPos = (r: number, c: number) => r >= 0 && r < boardRows && c >= 0 && c < boardCols
const canCapture = (attacker: piece, defender: piece, isDefenderInTrap: boolean, isAttackerInRiver: boolean, isDefenderInRiver: boolean): boolean => {
  if (attacker.color === defender.color) return false
  if (isDefenderInTrap) return true
  if (attacker.type === animalType.rat) {
    if (defender.type === animalType.elephant) return !isAttackerInRiver
    if (isAttackerInRiver && !isDefenderInRiver) return false
    return defender.type <= animalType.rat
  }
  if (attacker.type === animalType.elephant && defender.type === animalType.rat) return false
  return attacker.type >= defender.type
}
const getLegalMoves = (grid: (piece | null)[][], pos: position): position[] => {
  const moves: position[] = []
  const currentPiece = grid[pos.r][pos.c]
  if (!currentPiece) return []
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  dirs.forEach(([dr, dc]) => {
    const nr = pos.r + dr
    const nc = pos.c + dc
    if (!isValidPos(nr, nc)) return
    const targetTerrain = getTerrain(nr, nc)
    const targetPiece = grid[nr][nc]
    if (targetTerrain === terrainType.den) {
      const isOwnDen = (currentPiece.color === color.blue && nr === 0) || (currentPiece.color === color.red && nr === 8)
      if (isOwnDen) return
    }
    if (targetTerrain === terrainType.river) {
      if (currentPiece.type === animalType.rat) {
        if (!targetPiece || targetPiece.color !== currentPiece.color) {
          moves.push({ r: nr, c: nc })
        }
        return
      }
      if (currentPiece.type === animalType.tiger || currentPiece.type === animalType.lion) {
        let jumpR = nr
        let jumpC = nc
        let ratInWay = false
        while (isValidPos(jumpR, jumpC) && getTerrain(jumpR, jumpC) === terrainType.river) {
          if (grid[jumpR][jumpC]) {
            ratInWay = true
            break
          }
          jumpR += dr
          jumpC += dc
        }
        if (!ratInWay && isValidPos(jumpR, jumpC)) {
          const landingPiece = grid[jumpR][jumpC]
          if (!landingPiece) {
            moves.push({ r: jumpR, c: jumpC })
          } else {
            const isTrap = getTerrain(jumpR, jumpC) === terrainType.trap
            const isOpponentTrap = isTrap && (
              (currentPiece.color === color.blue && jumpR > 4) ||
              (currentPiece.color === color.red && jumpR < 4)
            )
            if (canCapture(currentPiece, landingPiece, isOpponentTrap, false, false)) {
              moves.push({ r: jumpR, c: jumpC })
            }
          }
        }
        return
      }
      return
    }
    const currentTerrain = getTerrain(pos.r, pos.c)
    const isAttackerInRiver = currentTerrain === terrainType.river
    if (!targetPiece) {
      moves.push({ r: nr, c: nc })
    } else {
      const isTrap = targetTerrain === terrainType.trap
      const isOpponentTrap = isTrap && (
        (currentPiece.color === color.blue && nr > 4) ||
        (currentPiece.color === color.red && nr < 4)
      )
      let inTrap = false
      if (currentPiece.color === color.blue) {
        if (nr <= 1) inTrap = true
      } else {
        if (nr >= 7) inTrap = true
      }
      if (canCapture(currentPiece, targetPiece, inTrap, isAttackerInRiver, false)) {
        moves.push({ r: nr, c: nc })
      }
    }
  })
  return moves
}
const checkGameStatus = (grid: (piece | null)[][], turn: color): gameStatus => {
  if (grid[0][3]?.color === color.red) return gameStatus.redWon
  if (grid[8][3]?.color === color.blue) return gameStatus.blueWon
  let redCount = 0
  let blueCount = 0
  for (let r = 0; r < boardRows; r++) {
    for (let c = 0; c < boardCols; c++) {
      const p = grid[r][c]
      if (p) {
        if (p.color === color.red) redCount++
        else blueCount++
      }
    }
  }
  if (redCount === 0) return gameStatus.blueWon
  if (blueCount === 0) return gameStatus.redWon
  let hasMoves = false
  for (let r = 0; r < boardRows; r++) {
    for (let c = 0; c < boardCols; c++) {
      const p = grid[r][c]
      if (p && p.color === turn) {
        if (getLegalMoves(grid, { r, c }).length > 0) {
          hasMoves = true
          break
        }
      }
    }
    if (hasMoves) break
  }
  if (!hasMoves) return turn === color.red ? gameStatus.blueWon : gameStatus.redWon
  return gameStatus.playing
}
const evaluateBoard = (grid: (piece | null)[][], botColor: color): number => {
  let score = 0
  const enemyDenR = botColor === color.blue ? 8 : 0
  const enemyDenC = 3
  for (let r = 0; r < boardRows; r++) {
    for (let c = 0; c < boardCols; c++) {
      const p = grid[r][c]
      if (!p) continue
      let val = p.type * 10
      if (p.type === animalType.rat) val = 15
      const dist = Math.abs(r - enemyDenR) + Math.abs(c - enemyDenC)
      const posVal = (20 - dist)
      if (p.color === botColor) {
        score += val + posVal
      } else {
        score -= (val + posVal)
      }
    }
  }
  return score
}
const findBestMove = async (
  grid: (piece | null)[][],
  difficultyLevel: difficulty,
  turn: color,
  playerSide: color
): Promise<move | null> => {
  const allMoves: move[] = []
  for (let r = 0; r < boardRows; r++) {
    for (let c = 0; c < boardCols; c++) {
      const p = grid[r][c]
      if (p && p.color === turn) {
        const legal = getLegalMoves(grid, { r, c })
        legal.forEach(to => {
          const target = grid[to.r][to.c]
          allMoves.push({
            from: { r, c },
            to,
            captured: target,
            pieceType: p.type
          })
        })
      }
    }
  }
  if (allMoves.length === 0) return null
  const scoredMoves = allMoves.map(move => {
    const nextGrid = grid.map(row => [...row])
    nextGrid[move.to.r][move.to.c] = nextGrid[move.from.r][move.from.c]
    nextGrid[move.from.r][move.from.c] = null
    let score = evaluateBoard(nextGrid, turn)
    if (move.captured) score += (move.captured.type * 50)
    const targetTerrain = getTerrain(move.to.r, move.to.c)
    if (targetTerrain === terrainType.den) score += 1000
    const randomFactor = difficultyLevel === difficulty.easy ? Math.random() * 50 :
      difficultyLevel === difficulty.medium ? Math.random() * 20 :
        Math.random() * 5
    return { ...move, score: score + randomFactor }
  })
  scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0))
  await new Promise(r => setTimeout(r, 500))
  return scoredMoves[0]
}
const BoardSquare = ({
  r, c, piece, isSelected, isValidMove, isLastFrom, isLastTo, onClick
}: {
  r: number, c: number, piece: piece | null, isSelected: boolean, isValidMove: boolean, isLastFrom: boolean, isLastTo: boolean, onClick: () => void
}) => {
  const terrain = getTerrain(r, c)
  let bgClass = ''
  let borderClass = ''
  switch (terrain) {
    case terrainType.river:
      bgClass = 'bg-cyan-900/40 border-cyan-800/30'
      break
    case terrainType.trap:
      bgClass = 'bg-purple-900/20 border-purple-800/30'
      break
    case terrainType.den:
      if (r === 0) bgClass = 'bg-blue-900/30 border-blue-400/50'
      else bgClass = 'bg-red-900/30 border-red-400/50'
      break
    default:
      bgClass = (r + c) % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'
      borderClass = 'border-white/5'
  }
  if (isSelected) bgClass = 'bg-yellow-500/20 ring-1 ring-yellow-400/50'
  else if (isLastFrom || isLastTo) bgClass = 'bg-yellow-500/10'
  else if (isValidMove) {
    bgClass = piece ? 'bg-red-400/20 ring-1 ring-red-300/50' : 'bg-green-400/20 ring-1 ring-green-300/50'
  }
  return (
    <div
      onClick={onClick}
      className={`
        relative w-full h-full flex items-center justify-center cursor-pointer
        transition-all duration-200 border ${borderClass} ${bgClass}
        overflow-hidden
      `}
    >
      {terrain === terrainType.den && (
        <Castle className={`w-2/3 h-2/3 opacity-20 ${r === 0 ? 'text-blue-400' : 'text-red-300'}`} />
      )}
      {terrain === terrainType.trap && (
        <Crosshair className="w-1/2 h-1/2 opacity-15 text-purple-400" />
      )}
      {terrain === terrainType.river && (
        <Waves className="w-1/2 h-1/2 opacity-15 text-cyan-400 animate-pulse" style={{ animationDuration: '3s' }} />
      )}
      {isValidMove && !piece && (
        <div className="absolute w-2 h-2 bg-green-400 rounded-full opacity-50 animate-pulse" />
      )}
      {piece && (
        <div className={`
          absolute inset-0 flex items-center justify-center select-none
          transition-transform duration-200 z-10
          ${isSelected ? 'scale-110' : 'hover:scale-105'}
        `}>
          <div className={`
             text-[min(8vw,5vh)] leading-none filter
             ${piece.color === color.blue
              ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
              : 'drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]'
            }
          `}>
            {animalEmojis[piece.type]}
          </div>
        </div>
      )}
    </div>
  )
}
export default function Home() {
  const [grid, setGrid] = useState(createInitialBoard())
  const [turn, setTurn] = useState<color>(color.blue)
  const [status, setStatus] = useState<gameStatus>(gameStatus.playing)
  const [selectedPos, setSelectedPos] = useState<position | null>(null)
  const [validMoves, setValidMoves] = useState<position[]>([])
  const [history, setHistory] = useState<move[]>([])
  const [lastMove, setLastMove] = useState<move | null>(null)
  const [currentGameMode, setCurrentGameMode] = useState<gameMode>(gameMode.pvp)
  const [currentDifficulty, setCurrentDifficulty] = useState<difficulty>(difficulty.medium)
  const [playerSide, setPlayerSide] = useState<color>(color.blue)
  const [isThinking, setIsThinking] = useState(false)
  const [selectedTutorialPiece, setSelectedTutorialPiece] = useState<animalType | null>(null)
  const resetGame = useCallback(() => {
    setGrid(createInitialBoard())
    setTurn(color.blue)
    setStatus(gameStatus.playing)
    setHistory([])
    setLastMove(null)
    setSelectedPos(null)
    setValidMoves([])
    setIsThinking(false)
  }, [])
  const handleMove = (move: move) => {
    const newGrid = grid.map(r => [...r])
    newGrid[move.to.r][move.to.c] = newGrid[move.from.r][move.from.c]
    newGrid[move.from.r][move.from.c] = null
    setGrid(newGrid)
    setHistory(prev => [...prev, move])
    setLastMove(move)
    const nextTurn = turn === color.blue ? color.red : color.blue
    const newStatus = checkGameStatus(newGrid, nextTurn)
    setTurn(nextTurn)
    setStatus(newStatus)
    setSelectedPos(null)
    setValidMoves([])
  }
  const onSquareClick = (pos: position) => {
    if (status !== gameStatus.playing || isThinking) return
    if (currentGameMode === gameMode.bot && turn !== playerSide) return
    const clickedPiece = grid[pos.r][pos.c]
    const isSameColor = clickedPiece && clickedPiece.color === turn
    if (isSameColor) {
      setSelectedPos(pos)
      setValidMoves(getLegalMoves(grid, pos))
      return
    }
    if (selectedPos) {
      const isMoveValid = validMoves.some(m => m.r === pos.r && m.c === pos.c)
      if (isMoveValid) {
        const movingPiece = grid[selectedPos.r][selectedPos.c]!
        handleMove({
          from: selectedPos,
          to: pos,
          captured: clickedPiece,
          pieceType: movingPiece.type,
        })
      } else {
        setSelectedPos(null)
        setValidMoves([])
      }
    }
  }
  useEffect(() => {
    const runBot = async () => {
      if (currentGameMode === gameMode.bot && status === gameStatus.playing && turn !== playerSide) {
        setIsThinking(true)
        const bestMove = await findBestMove(grid, currentDifficulty, turn, playerSide)
        setIsThinking(false)
        if (bestMove) {
          handleMove(bestMove)
        } else {
          setStatus(turn === color.red ? gameStatus.blueWon : gameStatus.redWon)
        }
      }
    }
    runBot()
  }, [turn, currentGameMode, status, playerSide, currentDifficulty])
  const handleUndo = () => {
    if (history.length === 0 || isThinking) return
    let steps = 1
    if (currentGameMode === gameMode.bot) {
      if (turn === playerSide) steps = 2
      else steps = 1
    }
    if (history.length < steps) steps = history.length
    if (steps === 0) return
    const targetHistory = history.slice(0, history.length - steps)
    let replayGrid = createInitialBoard()
    let replayTurn = color.blue
    targetHistory.forEach(m => {
      replayGrid[m.to.r][m.to.c] = replayGrid[m.from.r][m.from.c]
      replayGrid[m.from.r][m.from.c] = null
      replayTurn = replayTurn === color.blue ? color.red : color.blue
    })
    setGrid(replayGrid)
    setTurn(replayTurn)
    setHistory(targetHistory)
    setLastMove(targetHistory.length > 0 ? targetHistory[targetHistory.length - 1] : null)
    setStatus(gameStatus.playing)
    setSelectedPos(null)
    setValidMoves([])
  }
  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans text-slate-200 bg-slate-950 selection:bg-green-400/30">
      <header className="bg-slate-900/80 backdrop-blur border-b border-white/5 z-40 shadow-2xl shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg shadow-lg flex items-center justify-center text-white/90 border border-white/20">
              <span className="text-2xl">🌿</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Animal <span className="text-green-400">Chess</span></h1>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em]">Dou Shou Qi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded focus:outline-none focus:border-green-400"
              value={currentGameMode}
              onChange={(e) => { setCurrentGameMode(e.target.value as gameMode); resetGame() }}
            >
              <option value={gameMode.pvp}>PVP</option>
              <option value={gameMode.bot}>PVE</option>
            </select>
            <button onClick={resetGame} className="flex items-center gap-1 bg-green-400 hover:bg-green-300 text-white px-3 py-1.5 rounded text-xs font-bold shadow transition-colors">
              <RefreshCw className="w-3 h-3" /> New Game
            </button>
            <button onClick={handleUndo} disabled={history.length === 0} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50 transition-colors">
              Undo
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <aside className="hidden lg:flex lg:w-64 bg-slate-900/50 border-r border-white/5 flex-col z-30 overflow-y-auto custom-scrollbar shrink-0">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-3 h-3 text-green-400" />
              <h2 className="font-bold text-green-400 text-xs uppercase tracking-wider">Settings</h2>
            </div>
            {currentGameMode === gameMode.bot && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Difficulty</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[difficulty.easy, difficulty.medium, difficulty.hard].map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setCurrentDifficulty(diff)}
                        className={`py-1 rounded text-[10px] font-bold border transition-all ${currentDifficulty === diff ? 'bg-green-400 text-white border-green-300' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'}`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Play As</label>
                  <div className="flex gap-1">
                    <button className={`flex-1 py-1 rounded text-[10px] font-bold border ${playerSide === color.blue ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-800 text-slate-500 border-slate-700'}`} onClick={() => { setPlayerSide(color.blue); resetGame() }}>Blue</button>
                    <button className={`flex-1 py-1 rounded text-[10px] font-bold border ${playerSide === color.red ? 'bg-red-400 text-white border-red-300' : 'bg-slate-800 text-slate-500 border-slate-700'}`} onClick={() => { setPlayerSide(color.red); resetGame() }}>Red</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-3 h-3 text-yellow-500" />
              <h2 className="font-bold text-yellow-500 text-xs uppercase tracking-wider">Rules & Ranks</h2>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {[animalType.rat, animalType.cat, animalType.dog, animalType.wolf, animalType.leopard, animalType.tiger, animalType.lion, animalType.elephant].map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedTutorialPiece(type)}
                  className={`
                    px-2 py-1.5 rounded text-[10px] font-bold border text-left flex items-center gap-2 transition-all
                    ${selectedTutorialPiece === type ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800'}
                  `}
                >
                  <div className="w-4 h-4 text-base leading-none">
                    {animalEmojis[type]}
                  </div>
                  {animalNames[type]}
                </button>
              ))}
            </div>
            {selectedTutorialPiece ? (
              <div className="bg-slate-800 p-3 rounded border border-slate-700 text-xs text-slate-300 leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                <strong className="block mb-1 text-green-400">{animalNames[selectedTutorialPiece]}</strong>
                {tutorialText[selectedTutorialPiece]}
              </div>
            ) : (
              <div className="text-center p-4 text-[10px] text-slate-600 border border-dashed border-slate-800 rounded">Select An Animal To See Details</div>
            )}
          </div>
        </aside>
        <section className="flex-1 flex flex-col items-center justify-center p-2 relative z-10 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
          <div className="mb-3 w-full max-w-md z-20 shrink-0">
            {status === gameStatus.playing ? (
              <div className="bg-slate-900/80 backdrop-blur rounded-full px-6 py-2 flex items-center justify-between border border-white/10 shadow-lg">
                <div className={`flex items-center gap-2 ${turn === color.blue ? 'opacity-100 scale-105' : 'opacity-40'} transition-all`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse"></div>
                  <span className="font-bold text-sm text-blue-400">Blue</span>
                </div>
                <div className="text-[10px] font-black text-slate-600 tracking-widest">
                  {isThinking ? <span className="animate-pulse text-yellow-500">THINKING...</span> : "VS"}
                </div>
                <div className={`flex items-center gap-2 ${turn === color.red ? 'opacity-100 scale-105' : 'opacity-40'} transition-all`}>
                  <span className="font-bold text-sm text-red-300">Red</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)] animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-yellow-500/30 px-8 py-4 rounded-2xl shadow-2xl text-center animate-in zoom-in duration-300">
                <div className="flex justify-center mb-2">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  {status === gameStatus.redWon ? 'Red Victory!' : status === gameStatus.blueWon ? 'Blue Victory!' : 'Draw!'}
                </h2>
                <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-3">Game Over</p>
                <button onClick={resetGame} className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg transition-transform active:scale-95">Play Again</button>
              </div>
            )}
          </div>
          <div className="relative shadow-2xl rounded-lg overflow-hidden border-4 border-slate-800 bg-slate-900 shrink-0"
            style={{
              height: 'min(80vh, 100vw)',
              aspectRatio: `${boardCols}/${boardRows}`
            }}>
            <div
              className="grid w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${boardCols}, 1fr)`,
                gridTemplateRows: `repeat(${boardRows}, 1fr)`
              }}
            >
              {grid.map((row, r) => row.map((piece, c) => {
                const isSelected = selectedPos?.r === r && selectedPos?.c === c
                const isLastFrom = lastMove?.from.r === r && lastMove?.from.c === c
                const isLastTo = lastMove?.to.r === r && lastMove?.to.c === c
                const isValidMove = validMoves.some(m => m.r === r && m.c === c)
                return (
                  <BoardSquare
                    key={`${r}-${c}`}
                    r={r} c={c}
                    piece={piece}
                    isSelected={isSelected}
                    isValidMove={isValidMove}
                    isLastFrom={isLastFrom}
                    isLastTo={isLastTo}
                    onClick={() => onSquareClick({ r, c })}
                  />
                )
              }))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}