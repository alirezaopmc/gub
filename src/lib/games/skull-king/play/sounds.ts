/** Optional Web Audio cues for play UI. */

let muted = false

export function setPlaySoundsMuted(value: boolean): void {
  muted = value
  if (typeof window !== "undefined") {
    localStorage.setItem("skull-king:sounds-muted", value ? "1" : "0")
  }
}

export function isPlaySoundsMuted(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem("skull-king:sounds-muted") === "1"
  }
  return muted
}

export function playCardSound(): void {
  if (isPlaySoundsMuted() || typeof window === "undefined") return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 220
    gain.gain.value = 0.04
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.06)
    void ctx.close()
  } catch {
    // ignore
  }
}
