const CODES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

export function normalizeMatchCode(code: string): string {
  return code.trim().toUpperCase().slice(0, 2)
}

export function isValidMatchCode(code: string): boolean {
  const n = normalizeMatchCode(code)
  return n.length === 2 && /^[A-Z]{2}$/.test(n)
}

export function generateMatchCode(taken: ReadonlySet<string>, rng: () => number = Math.random): string {
  for (let attempt = 0; attempt < 500; attempt++) {
    const a = CODES[Math.floor(rng() * 26)]!
    const b = CODES[Math.floor(rng() * 26)]!
    const code = `${a}${b}`
    if (!taken.has(code)) return code
  }
  throw new Error("could not allocate match code")
}

export function generatePlayerId(): string {
  return `p_${Math.random().toString(36).slice(2, 12)}`
}
