"use client"

import * as React from "react"
import { flushSync } from "react-dom"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Deliberate hold (~1s) for destructive confirms; matches common product timing without feeling sluggish. */
const DEFAULT_HOLD_MS = 1000
/** Release within this window after press counts as a short tap → `onShortTapHint`. Keep below `holdDurationMs`. */
const DEFAULT_TAP_HINT_THRESHOLD_MS = 400
export type HoldToConfirmEraseProps = {
  onConfirm: () => void
  holdDurationMs?: number
  tapHintThresholdMs?: number
  /** Fired when the user releases before the hold completes, within `tapHintThresholdMs`. */
  onShortTapHint?: () => void
  labelIdle?: string
  /** Announced to assistive tech; describes the destructive outcome. */
  ariaDescription: string
  className?: string
  variant?: "destructive" | "caution"
  size?: "default" | "lg"
  /**
   * Screen-reader sentence after standard hold instructions (quick-tap behavior).
   * Defaults to erase-save copy for hub “Start fresh”.
   */
  shortTapOutcomeSr?: string
}

/**
 * Press-and-hold confirm. Fill advances linearly with elapsed time (0 → `holdDurationMs`).
 * Short taps may call `onShortTapHint`. Keyboard: hold Space; blur cancels.
 */
export function HoldToConfirmErase({
  onConfirm,
  holdDurationMs = DEFAULT_HOLD_MS,
  tapHintThresholdMs = DEFAULT_TAP_HINT_THRESHOLD_MS,
  onShortTapHint,
  labelIdle = "Hold to erase save",
  ariaDescription,
  className,
  variant = "destructive",
  size = "default",
  shortTapOutcomeSr,
}: HoldToConfirmEraseProps) {
  const descId = React.useId()
  const [progress, setProgress] = React.useState(0)
  const holdingRef = React.useRef(false)
  const completedRef = React.useRef(false)
  const rafRef = React.useRef(0)
  const startTimeRef = React.useRef(0)

  const clearRaf = React.useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const reset = React.useCallback(() => {
    holdingRef.current = false
    clearRaf()
    setProgress(0)
  }, [clearRaf])

  const finish = React.useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    holdingRef.current = false
    clearRaf()
    // Flush so full width paints before navigation runs.
    flushSync(() => {
      setProgress(1)
    })
    onConfirm()
  }, [clearRaf, onConfirm])

  const startHold = React.useCallback(() => {
    if (completedRef.current) return
    holdingRef.current = true
    startTimeRef.current = performance.now()
    clearRaf()

    const loop = (now: number) => {
      if (!holdingRef.current || completedRef.current) return
      const elapsed = now - startTimeRef.current
      const t = Math.min(1, elapsed / holdDurationMs)
      setProgress(t)
      if (t >= 1) {
        finish()
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [clearRaf, finish, holdDurationMs])

  const endHold = React.useCallback(() => {
    if (completedRef.current) return
    const wasHolding = holdingRef.current
    const elapsed = wasHolding ? performance.now() - startTimeRef.current : 0
    reset()
    if (wasHolding && elapsed < tapHintThresholdMs) {
      onShortTapHint?.()
    }
  }, [reset, tapHintThresholdMs, onShortTapHint])

  React.useEffect(() => {
    return () => clearRaf()
  }, [clearRaf])

  const fillWidthPct = Math.min(100, Math.max(0, progress * 100))

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <p id={descId} className="sr-only">
        {ariaDescription} Hold the button until the fill reaches the end, or release to cancel.{" "}
        {shortTapOutcomeSr ?? "A quick tap will not erase your save."}
      </p>
      <button
        type="button"
        className={cn(
          buttonVariants({ variant, size }),
          "relative w-full touch-none select-none overflow-hidden",
          size === "lg" ? "min-h-12" : "min-h-11",
        )}
        aria-label={labelIdle}
        aria-describedby={descId}
        aria-busy={progress >= 1}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          startHold()
        }}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onLostPointerCapture={endHold}
        onKeyDown={(e) => {
          if (e.key !== " " || e.repeat) return
          e.preventDefault()
          startHold()
        }}
        onKeyUp={(e) => {
          if (e.key !== " ") return
          endHold()
        }}
        onBlur={endHold}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-0 bg-destructive/30",
            progress >= 1 ? "rounded-xl" : "rounded-l-xl",
          )}
          style={{ width: `${fillWidthPct}%` }}
          aria-hidden
        />

        <span className="relative z-[1] flex w-full items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap">
          <span className="tabular-nums">{labelIdle}</span>
        </span>
      </button>
    </div>
  )
}
