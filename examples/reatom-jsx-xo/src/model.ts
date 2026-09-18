import {
  action,
  atom,
  computed,
  isCausedBy,
  memo,
  reatomEnum,
  sleep,
  withAsync,
  withChangeHook,
  wrap,
} from '@reatom/core'

import { triggerHaptic } from './haptics'
import { time } from './time'

export type Player = 'X' | 'O'
export type Cell = null | Player
export type Winner = 'none' | Player | 'draw'

export const board = atom<Array<Cell>>(Array(9).fill(null), 'board')

export const currentPlayer = reatomEnum(['X', 'O'], 'currentPlayer')

export const winner = reatomEnum(['none', 'X', 'O', 'draw'], 'winner')

export const showWinner = computed(() => {
  const winnerTime = memo(
    () => (winner() === 'none' ? Infinity : Date.now()),
    undefined,
    'winnerTime',
  )

  return winner() !== 'none' && winnerTime + 700 < time()
}, 'showWinner')

export const playWithComputer = atom(false, 'playWithComputer').extend(
  withChangeHook(() => {
    resetGame()
    xWins.set(0)
    xThinking.set(0)
    oWins.set(0)
    oThinking.set(0)
    draws.set(0)
  }),
)

export const computerPlayer = atom<Player>('O', 'computerPlayer')

export const computerMove = action(async () => {
  // Small delay to make it feel more natural
  await wrap(sleep(Math.max(500, Math.random() * 1500)))

  const bestMove = getBestMove(board())
  if (bestMove !== undefined) {
    makeMove(bestMove)
  }
}, 'computerMove').extend(withAsync())

export const isComputerThinking = computed(
  () => !computerMove.ready(),
  'isComputerThinking',
)

export const xWins = atom(0, 'xWins')
export const xThinking = atom(0, 'xThinking')

export const oWins = atom(0, 'oWins')
export const oThinking = atom(0, 'oThinking')

export const draws = atom(0, 'draws')

const winningCombinations: Array<[number, number, number]> = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal
  [2, 4, 6], // anti-diagonal
]

const checkWinner = (board: Array<Cell>): Winner => {
  for (const combo of winningCombinations) {
    const [a, b, c] = combo
    const winnerCandidate = board[a]
    if (
      (winnerCandidate === 'X' || winnerCandidate === 'O') &&
      winnerCandidate === board[b] &&
      winnerCandidate === board[c]
    ) {
      return winnerCandidate
    }
  }

  // Check for draw
  if (board.every((cell) => cell !== null)) {
    return 'draw'
  }

  return 'none'
}

// Minimax algorithm for unbeatable AI
const minimax = (
  boardState: Array<Cell>,
  player: Player,
  depth: number = 0,
): number => {
  const winner = checkWinner(boardState)

  // Terminal states
  if (winner === computerPlayer()) return 10 - depth
  if (winner === 'draw') return 0
  if (winner !== 'none') return depth - 10

  const opponent: Player = player === 'X' ? 'O' : 'X'

  if (player === computerPlayer()) {
    // Maximizing player
    let bestScore = -Infinity
    for (let i = 0; i < 9; i++) {
      if (boardState[i] === null) {
        const newBoard = [...boardState]
        newBoard[i] = player
        const score = minimax(newBoard, opponent, depth + 1)
        bestScore = Math.max(bestScore, score)
      }
    }
    return bestScore
  } else {
    // Minimizing player
    let bestScore = Infinity
    for (let i = 0; i < 9; i++) {
      if (boardState[i] === null) {
        const newBoard = [...boardState]
        newBoard[i] = player
        const score = minimax(newBoard, opponent, depth + 1)
        bestScore = Math.min(bestScore, score)
      }
    }
    return bestScore
  }
}

const getBestMove = (boardState: Array<Cell>): number => {
  let bestScore = -Infinity
  let bestMove = 0

  for (let i = 0; i < 9; i++) {
    if (boardState[i] === null) {
      const newBoard = [...boardState]
      newBoard[i] = computerPlayer()
      const score = minimax(newBoard, 'X', 0)
      if (score > bestScore) {
        bestScore = score
        bestMove = i
      }
    }
  }

  return bestMove
}

export const makeMove = action((index: number) => {
  const currentState = board()
  // Don't allow moves if cell is taken or game is over
  if (currentState[index] !== null || winner() !== 'none') {
    // Haptic feedback for invalid move
    triggerHaptic('invalid')
    return
  }

  // FIXME: isCausedBy for actions
  // // Don't allow moves while computer is thinking
  if (isComputerThinking() && !isCausedBy(computerMove)) {
    return
  }

  const newState = [...currentState]
  newState[index] = currentPlayer()
  board.set(newState)

  // Haptic feedback for successful move
  triggerHaptic('move')

  // Check for winner
  const currentWinner = checkWinner(board())
  if (currentWinner !== 'none') {
    winner.set(currentWinner)
    // Haptic feedback for game end
    if (currentWinner === 'draw') {
      triggerHaptic('draw')
    } else {
      triggerHaptic('win')
    }
    // Update scores
    if (currentWinner === 'X') {
      xWins.set(xWins() + 1)
    } else if (currentWinner === 'O') {
      oWins.set(oWins() + 1)
    } else if (currentWinner === 'draw') {
      draws.set(draws() + 1)
    }
  } else {
    // Switch player
    if (currentPlayer() === 'X') {
      currentPlayer.setO()
    } else {
      currentPlayer.setX()
    }

    // If playing with computer and it's computer's turn, make computer move
    if (playWithComputer() && currentPlayer() === computerPlayer()) {
      computerMove()
    }
  }
}, 'makeMove')

export const resetGame = action(() => {
  board.set(Array(9).fill(null))
  currentPlayer.setX()
  winner.setNone()
  // Haptic feedback for reset
  triggerHaptic('reset')
  // Note: playWithComputer setting is preserved
}, 'resetGame')
