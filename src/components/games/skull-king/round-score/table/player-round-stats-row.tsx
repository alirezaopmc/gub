"use client"

import * as React from "react"
import { Star } from "lucide-react"
import { Tooltip } from "radix-ui"

import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import {
  clampTricksToHand,
  effectiveTricksBid,
} from "@/lib/games/skull-king/round-score/bid-won-validation"
import { cn } from "@/lib/utils"

export type PlayerRoundStatsRowProps = {
  rank: number
  playerName: string
  /** This crew member leads the round (plays first); icon + hint next to the name. */
  isRoundStarter?: boolean
  bid: number | null
  won: number | null
  maxTricks: number
  editableBid: boolean
  editableWon: boolean
  onBidChange?: (value: number | null) => void
  onWonChange?: (value: number | null) => void
  /** When set, renders an Events column (use with `.tableGridWithEvents` on the table). */
  eventsSlot?: React.ReactNode
  /** Voyage view: this round (empty until tallied) + running total. */
  voyagePoints?: { thisRound: number | null; total: number } | null
  /** Running voyage score through the viewed round (finalized sums + live preview when applicable). */
  runningTotalThroughRound?: number
  /** Harry the Giant bid tweak — appends +1 / −1 after the bid (same line, gold). */
  harryGiantBidDelta?: 1 | -1 | null
  /** When false, only the bid control is shown (tricks won hidden). */
  showWon?: boolean
  /** After entering one digit in the bid cell, focus the next row’s bid (if any). */
  bidFocusNext?: () => void
  bidInputRef?: React.Ref<HTMLInputElement>
  /** After entering one digit in the won cell, focus the next row’s won (if any). */
  wonFocusNext?: () => void
  wonInputRef?: React.Ref<HTMLInputElement>
  /**
   * Round page: bid/won main score + bonuses, or live preview of known bonuses only.
   * When omitted, no Round score column cell is rendered (narrow dialogs).
   */
  roundScore?: RoundScoreCell | null
}

export type RoundScoreCell =
  | { kind: "final"; main: number; bonus: number }
  | { kind: "preview"; bonus: number }

function formatPts(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  return `${v.toLocaleString("en-US")} PTS`
}

/** Explicit + / − prefix for round-score segments (0 → +0). */
function formatSignedTrickPoints(n: number): string {
  if (!Number.isFinite(n)) return "+0"
  if (n > 0) return `+${n}`
  if (n < 0) return `-${Math.abs(n)}`
  return "+0"
}

function segmentToneClass(
  n: number,
  styles: {
    up: string
    down: string
    zero: string
  },
): string {
  if (!Number.isFinite(n) || n === 0) return styles.zero
  return n > 0 ? styles.up : styles.down
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim()
  if (t === "") return null
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * After this keystroke, move focus to the next field when the value is fully determined for the hand.
 * Includes: overshoot then clamp to cap (e.g. 9 with max 8), complete multi-digit (e.g. "10" with max 10),
 * and single-digit completion without being a prefix of another valid count (e.g. "1" with max 8).
 */
function shouldAdvanceTrickInputFocus(raw: string, maxTricks: number): boolean {
  const t = raw.trim()
  if (t === "") return false
  const parsed = Number.parseInt(t, 10)
  if (!Number.isFinite(parsed)) return false
  const max = Math.max(0, Math.floor(maxTricks))
  if (parsed > max) return true
  const committed = clampTricksToHand(maxTricks, parsed)
  if (committed === null) return false
  if (t === String(committed) && t.length > 1) return true
  if (!/^\d$/.test(t)) return false
  const d = Number(t)
  if (!Number.isFinite(d)) return false
  for (let v = 10; v <= max; v++) {
    if (String(v).startsWith(t)) return false
  }
  return true
}

function TrickField({
  value,
  maxTricks,
  editable,
  onChange,
  ariaLabel,
  suffix,
  inputRef,
  focusNextAfterDigit,
}: {
  value: number | null
  maxTricks: number
  editable: boolean
  onChange?: (value: number | null) => void
  ariaLabel: string
  suffix?: React.ReactNode
  inputRef?: React.Ref<HTMLInputElement>
  /** After a single digit that fully specifies the value, focus the next field (bid entry flow). */
  focusNextAfterDigit?: () => void
}) {
  const display = value === null ? "?" : String(value)

  const field = !editable ? (
    <div className={styles.trickCell} aria-label={ariaLabel}>
      {display}
    </div>
  ) : (
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      min={0}
      max={maxTricks}
      aria-label={ariaLabel}
      className={styles.trickInput}
      value={value === null ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value
        onChange?.(parseOptionalInt(raw))
        if (focusNextAfterDigit && shouldAdvanceTrickInputFocus(raw, maxTricks)) {
          requestAnimationFrame(() => focusNextAfterDigit())
        }
      }}
    />
  )

  if (suffix === undefined) return field

  return (
    <div className={styles.trickWithSuffix}>
      {field}
      {suffix}
    </div>
  )
}

export function PlayerRoundStatsRow({
  rank,
  playerName,
  isRoundStarter = false,
  bid,
  won,
  maxTricks,
  editableBid,
  editableWon,
  onBidChange,
  onWonChange,
  eventsSlot,
  harryGiantBidDelta,
  showWon = true,
  voyagePoints,
  bidFocusNext,
  bidInputRef,
  wonFocusNext,
  wonInputRef,
  roundScore,
  runningTotalThroughRound,
}: PlayerRoundStatsRowProps) {
  const effectiveBid = effectiveTricksBid(maxTricks, bid, harryGiantBidDelta ?? null)
  const mismatch =
    showWon && effectiveBid !== null && won !== null && effectiveBid !== won
  const showHarry = harryGiantBidDelta === 1 || harryGiantBidDelta === -1
  const useVoyagePts = voyagePoints != null

  return (
    <div
      className={cn(styles.row, isRoundStarter && styles.rowRoundStarter)}
    >
      <div className={styles.rank}>{rank}</div>
      <div className={styles.nameBlock}>
        <div
          className={styles.nameLine}
          {...(runningTotalThroughRound !== undefined
            ? {
                role: "group",
                "aria-label": `${playerName}, voyage total through this round: ${runningTotalThroughRound} points`,
              }
            : {})}
        >
          <div className={styles.nameLabelCluster}>
            <span className={styles.playerName}>{playerName}</span>
            {isRoundStarter ? (
              <Tooltip.Root delayDuration={180}>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={styles.roundStarterTrigger}
                    aria-label="Goes first this round"
                  >
                    <Star
                      aria-hidden
                      className={styles.roundStarterIcon}
                      size={13}
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className={styles.roundStarterTooltipContent}
                    side="top"
                    sideOffset={6}
                  >
                    Goes first this round.
                    <Tooltip.Arrow className={styles.roundStarterTooltipArrow} />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : null}
          </div>
          {runningTotalThroughRound !== undefined ? (
            <div className={styles.nameColumnVoyagePts}>
              <span className={styles.runningTotalSuffix} aria-hidden>
                {runningTotalThroughRound}
              </span>
              <span className={styles.runningTotalPtsLabel} aria-hidden>
                PTS
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          styles.bidWonCell,
          showWon && styles.bidWonCellSplit,
          mismatch && styles.trickCellMismatch,
        )}
      >
        <div className={styles.bidWonSide}>
          <TrickField
            value={bid}
            maxTricks={maxTricks}
            editable={editableBid}
            onChange={onBidChange}
            ariaLabel={`${playerName} bid`}
            focusNextAfterDigit={bidFocusNext}
            inputRef={bidInputRef}
            suffix={
              showHarry ? (
                <span className={styles.bidHarryDelta} aria-label="Harry the Giant: effective bid ±1">
                  {harryGiantBidDelta === 1 ? "+1" : "−1"}
                </span>
              ) : undefined
            }
          />
        </div>
        {showWon ? (
          <>
            <span className={styles.bidWonSep} aria-hidden>
              {" | "}
            </span>
            <div className={styles.bidWonSide}>
              <TrickField
                value={won}
                maxTricks={maxTricks}
                editable={editableWon}
                onChange={onWonChange}
                ariaLabel={`${playerName} won`}
                inputRef={wonInputRef}
                focusNextAfterDigit={wonFocusNext}
              />
            </div>
          </>
        ) : null}
      </div>
      {roundScore != null ? (
        <div
          className={styles.roundScoreCell}
          aria-label={
            roundScore.kind === "final"
              ? `${playerName} points this hand: ${roundScore.main} main, ${roundScore.bonus} bonus`
              : `${playerName} known bonus so far this hand: ${roundScore.bonus}`
          }
        >
          {roundScore.kind === "final" ? (
            <>
              <span
                className={cn(
                  styles.roundScoreSegment,
                  segmentToneClass(roundScore.main, {
                    up: styles.roundScoreUp,
                    down: styles.roundScoreDown,
                    zero: styles.roundScoreZero,
                  }),
                )}
              >
                {formatSignedTrickPoints(roundScore.main)}
              </span>
              {roundScore.bonus !== 0 ? (
                <span
                  className={cn(
                    styles.roundScoreSegment,
                    segmentToneClass(roundScore.bonus, {
                      up: styles.roundScoreUp,
                      down: styles.roundScoreDown,
                      zero: styles.roundScoreZero,
                    }),
                  )}
                >
                  {formatSignedTrickPoints(roundScore.bonus)}
                </span>
              ) : null}
            </>
          ) : roundScore.bonus === 0 ? (
            <span
              className={cn(
                styles.roundScoreSegment,
                segmentToneClass(0, {
                  up: styles.roundScoreUp,
                  down: styles.roundScoreDown,
                  zero: styles.roundScoreZero,
                }),
              )}
            >
              {formatSignedTrickPoints(0)}
            </span>
          ) : (
            <span
              className={cn(
                styles.roundScoreSegment,
                segmentToneClass(roundScore.bonus, {
                  up: styles.roundScoreUp,
                  down: styles.roundScoreDown,
                  zero: styles.roundScoreZero,
                }),
              )}
            >
              {formatSignedTrickPoints(roundScore.bonus)}
            </span>
          )}
        </div>
      ) : null}
      {useVoyagePts ? (
        <>
          <div
            className={styles.voyagePtsCell}
            aria-label={`${playerName} points this round`}
          >
            {voyagePoints.thisRound === null ? formatPts(0) : formatPts(voyagePoints.thisRound)}
          </div>
          <div
            className={styles.voyagePtsCell}
            aria-label={`${playerName} total points`}
          >
            {formatPts(voyagePoints.total)}
          </div>
        </>
      ) : null}
      {eventsSlot !== undefined ? <div className={styles.eventsCell}>{eventsSlot}</div> : null}
    </div>
  )
}
