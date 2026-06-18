/** Integer to Roman numerals (sufficient for crew officer labels). */
export function toRoman(n: number): string {
  const digits: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ]
  let rest = n
  let out = ""
  for (const [value, sym] of digits) {
    while (rest >= value) {
      out += sym
      rest -= value
    }
  }
  return out
}
