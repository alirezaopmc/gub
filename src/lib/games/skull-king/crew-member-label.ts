import { toRoman } from "@/lib/games/skull-king/roman-numeral"

export function crewMemberLabel(index: number): string {
  if (index === 0) return "Captain's name"
  return `Officer ${toRoman(index + 1)}`
}
