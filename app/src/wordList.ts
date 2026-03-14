import raw from '../../webapp/data/languages/en/en_5words.txt?raw'

export const validWords = new Set(
    raw.split('\n').map((w: string) => w.trim().toLowerCase()).filter((w: string) => w.length === 5),
)
