export type TileColor = 'correct' | 'semicorrect' | 'incorrect' | ''

export function scoreGuess(guess: string, target: string): TileColor[] {
    const result: TileColor[] = Array(5).fill('incorrect')
    const targetCounts: Record<string, number> = {}

    // Pass 1: greens
    for (let i = 0; i < 5; i++) {
        if (guess[i] === target[i]) {
            result[i] = 'correct'
        } else {
            targetCounts[target[i]] = (targetCounts[target[i]] ?? 0) + 1
        }
    }

    // Pass 2: yellows
    for (let i = 0; i < 5; i++) {
        if (result[i] === 'correct') continue
        if (targetCounts[guess[i]] > 0) {
            result[i] = 'semicorrect'
            targetCounts[guess[i]]--
        }
    }

    return result
}
