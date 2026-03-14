import { useCallback, useEffect, useReducer, useRef } from 'react'
import { scoreGuess, TileColor } from './gameLogic'
import { validWords } from './wordList'

const TARGET = 'agape'
const MAX_ROWS = 6
const WORD_LEN = 5
const STORAGE_KEY = 'agape-wordle'

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
]

interface GameState {
    guesses: string[][]
    colors: TileColor[][]
    keyColors: Record<string, TileColor>
    activeRow: number
    activeCell: number
    gameOver: boolean
    won: boolean
}

type Action =
    | { type: 'KEY'; key: string }
    | { type: 'ENTER' }
    | { type: 'BACKSPACE' }
    | { type: 'INVALID' }
    | { type: 'RESTORE'; state: GameState }

function initialState(): GameState {
    return {
        guesses: Array.from({ length: MAX_ROWS }, () => Array(WORD_LEN).fill('')),
        colors: Array.from({ length: MAX_ROWS }, () => Array(WORD_LEN).fill('' as TileColor)),
        keyColors: {},
        activeRow: 0,
        activeCell: 0,
        gameOver: false,
        won: false,
    }
}

function colorPriority(a: TileColor, b: TileColor): TileColor {
    const rank: Record<TileColor, number> = { correct: 3, semicorrect: 2, incorrect: 1, '': 0 }
    return rank[a] >= rank[b] ? a : b
}

function reducer(state: GameState, action: Action): GameState {
    if (action.type === 'RESTORE') return action.state
    if (state.gameOver) return state

    if (action.type === 'KEY') {
        if (state.activeCell >= WORD_LEN) return state
        const guesses = state.guesses.map((r) => [...r])
        guesses[state.activeRow][state.activeCell] = action.key.toLowerCase()
        return { ...state, guesses, activeCell: state.activeCell + 1 }
    }

    if (action.type === 'BACKSPACE') {
        if (state.activeCell === 0) return state
        const guesses = state.guesses.map((r) => [...r])
        guesses[state.activeRow][state.activeCell - 1] = ''
        return { ...state, guesses, activeCell: state.activeCell - 1 }
    }

    if (action.type === 'ENTER') {
        if (state.activeCell < WORD_LEN) return state
        const word = state.guesses[state.activeRow].join('')
        if (!validWords.has(word)) return state // handled by toast

        const rowColors = scoreGuess(word, TARGET)
        const colors = state.colors.map((r) => [...r])
        colors[state.activeRow] = rowColors

        const keyColors = { ...state.keyColors }
        for (let i = 0; i < WORD_LEN; i++) {
            const letter = word[i]
            keyColors[letter] = colorPriority(keyColors[letter] ?? '', rowColors[i])
        }

        const won = word === TARGET
        const nextRow = state.activeRow + 1
        const gameOver = won || nextRow >= MAX_ROWS

        return {
            ...state,
            colors,
            keyColors,
            activeRow: gameOver ? state.activeRow : nextRow,
            activeCell: gameOver ? state.activeCell : 0,
            gameOver,
            won,
        }
    }

    return state
}

const tileClass = (color: TileColor, hasLetter: boolean): string => {
    const base =
        'w-14 h-14 flex items-center justify-center text-2xl font-bold uppercase border-2 select-none transition-colors'
    if (color === 'correct') return `${base} bg-green-600 border-green-600 text-white`
    if (color === 'semicorrect') return `${base} bg-yellow-500 border-yellow-500 text-white`
    if (color === 'incorrect') return `${base} bg-gray-500 border-gray-500 text-white`
    return `${base} ${hasLetter ? 'border-gray-500' : 'border-gray-300'} text-black`
}

const keyClass = (color: TileColor): string => {
    const base =
        'h-14 rounded font-bold text-sm uppercase cursor-pointer flex items-center justify-center select-none'
    if (color === 'correct') return `${base} bg-green-600 text-white`
    if (color === 'semicorrect') return `${base} bg-yellow-500 text-white`
    if (color === 'incorrect') return `${base} bg-gray-500 text-white`
    return `${base} bg-gray-200 text-black`
}

export default function App() {
    const [state, dispatch] = useReducer(reducer, null, initialState)
    const toastRef = useRef<HTMLDivElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const [toast, setToast] = [useRef(''), useRef((_: string) => {})]

    // Simple toast state via DOM to avoid re-renders
    const showToast = useCallback((msg: string) => {
        if (!toastRef.current) return
        toastRef.current.textContent = msg
        toastRef.current.classList.remove('opacity-0')
        toastRef.current.classList.add('opacity-100')
        setTimeout(() => {
            if (toastRef.current) {
                toastRef.current.classList.remove('opacity-100')
                toastRef.current.classList.add('opacity-0')
            }
        }, 1500)
    }, [])

    const shakeRow = useCallback((row: number) => {
        if (!gridRef.current) return
        const rowEl = gridRef.current.children[row] as HTMLElement
        if (!rowEl) return
        rowEl.classList.add('shake')
        setTimeout(() => rowEl.classList.remove('shake'), 400)
    }, [])

    // Persist state
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch {}
    }, [state])

    // Restore state on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as GameState
                dispatch({ type: 'RESTORE', state: parsed })
            }
        } catch {}
    }, [])

    const handleKey = useCallback(
        (key: string) => {
            if (state.gameOver) return
            if (key === 'ENTER') {
                const word = state.guesses[state.activeRow].join('')
                if (state.activeCell < WORD_LEN) {
                    showToast('Not enough letters')
                    shakeRow(state.activeRow)
                    return
                }
                if (!validWords.has(word)) {
                    showToast('Not in word list')
                    shakeRow(state.activeRow)
                    return
                }
                dispatch({ type: 'ENTER' })
            } else if (key === 'BACKSPACE' || key === '⌫') {
                dispatch({ type: 'BACKSPACE' })
            } else if (/^[a-zA-Z]$/.test(key)) {
                dispatch({ type: 'KEY', key: key.toUpperCase() })
            }
        },
        [state, showToast, shakeRow],
    )

    // Physical keyboard
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return
            if (e.key === 'Enter') handleKey('ENTER')
            else if (e.key === 'Backspace') handleKey('BACKSPACE')
            else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleKey])

    // Show result toast when game ends
    const prevGameOver = useRef(false)
    useEffect(() => {
        if (state.gameOver && !prevGameOver.current) {
            setTimeout(() => {
                if (state.won) showToast('Brilliant!')
                else showToast(`The word was ${TARGET.toUpperCase()}`)
            }, 300)
        }
        prevGameOver.current = state.gameOver
    }, [state.gameOver, state.won, showToast])

    // suppress unused warning
    void toast
    void setToast
    void toastRef

    return (
        <div className="min-h-screen flex flex-col items-center bg-white">
            {/* Header */}
            <header className="w-full max-w-lg border-b border-gray-300 py-3 px-4 flex items-center justify-center">
                <h1 className="text-2xl font-bold tracking-widest uppercase">Wordle</h1>
            </header>

            {/* Toast */}
            <div
                ref={toastRef}
                className="fixed top-16 left-1/2 -translate-x-1/2 bg-black text-white text-sm font-bold px-4 py-2 rounded opacity-0 transition-opacity duration-300 z-50 pointer-events-none"
            />

            {/* Grid */}
            <div ref={gridRef} className="flex flex-col gap-1.5 mt-8 mb-8">
                {state.guesses.map((row, ri) => (
                    <div key={ri} className="flex gap-1.5">
                        {row.map((letter, ci) => (
                            <div key={ci} className={tileClass(state.colors[ri][ci], letter !== '')}>
                                {letter}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Keyboard */}
            <div className="flex flex-col gap-1.5 w-full max-w-lg px-2">
                {KEYBOARD_ROWS.map((row, ri) => (
                    <div key={ri} className="flex gap-1.5 justify-center">
                        {row.map((key) => (
                            <button
                                key={key}
                                className={`${keyClass(state.keyColors[key.toLowerCase()] ?? '')} ${
                                    key === 'ENTER' || key === '⌫' ? 'px-3 min-w-[4rem]' : 'w-10'
                                }`}
                                onClick={() => handleKey(key)}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
