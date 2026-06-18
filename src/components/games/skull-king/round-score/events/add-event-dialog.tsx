"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import {
  addableEventLabel,
  getAddableEventKinds,
  type AddableEventKind,
} from "@/lib/games/skull-king/round-score/add-event-availability"

/** Fixed order for the event-type toolbar (matches setup toggles). */
const EVENT_KIND_ORDER: readonly AddableEventKind[] = [
  "alliance",
  "pirateAbility",
  "characterCapture",
  "fourteenBonus",
] as const
import {
  getRoundEventLogEntries,
  type RoundEventLogEntry,
} from "@/lib/games/skull-king/round-score/round-event-timeline"
import { areAllNamedPlayersBidsSet } from "@/lib/games/skull-king/round-score/named-player-inputs-complete"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"
import type { RoundEvent } from "@/lib/games/skull-king/round-score/types"
import { FOURTEEN_SUITS, MAX_MERMAIDS_IN_GAME, MAX_PIRATES_IN_GAME } from "@/lib/games/skull-king/round-score/types"
import { nameEqualityKey } from "@/lib/games/skull-king/crew-name-validation"
import { cn } from "@/lib/utils"
import { TrashIcon } from "@/components/games/skull-king/setup/crew/crew-manifesto-icons"

import addStyles from "@/components/games/skull-king/round-score/styles/event-dialog.module.css"

type Step =
  | { t: "menu" }
  | { t: "al_loot" }
  | { t: "al_trick"; loot: number }
  | { t: "pir_o" }
  | { t: "pir_k"; owner: number }
  | { t: "pir_v"; owner: number; pirate: "harry" | "rascal" }
  | { t: "cap_c" }
  | { t: "cap_t"; capturer: number }
  | { t: "cap_n"; capturer: number; capturingCard: "pirate" | "king" }
  | { t: "fb_p" }
  | { t: "fb_s"; player: number }

function namedPlayerIndices(players: readonly string[]): { index: number; name: string }[] {
  return players
    .map((name, index) => ({ name: name.trim(), index }))
    .filter((x) => nameEqualityKey(x.name) !== "")
}

type EventsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When the dialog opens, start on the event log or jump straight into the add flow. */
  defaultHub?: "list" | "add"
  trigger?: React.ReactNode
}

function stepTitle(step: Step): string {
  switch (step.t) {
    case "menu":
      return "Add event"
    case "al_loot":
      return "Alliance"
    case "al_trick":
      return "Alliance"
    case "pir_o":
    case "pir_k":
    case "pir_v":
      return "Pirate ability"
    case "cap_c":
    case "cap_t":
    case "cap_n":
      return "Character capture"
    case "fb_p":
    case "fb_s":
      return "Fourteen bonus"
    default: {
      const _e: never = step
      return _e
    }
  }
}

function stepSubtitle(step: Step): string | null {
  switch (step.t) {
    case "menu":
      return "Choose an event to log for this round."
    case "al_loot":
      return "Who played the Loot (as an escape)?"
    case "al_trick":
      return "Who won the trick?"
    case "pir_o":
      return "Whose pirate won the trick (ability owner)?"
    case "pir_k":
      return "Which pirate’s ability is used?"
    case "pir_v": {
      if (step.pirate === "harry") return "Adjust the bid by +1 or −1 (applies to the bid cell; B+1 / B−1)."
      return "Wager 10 or 20 points on making your bid."
    }
    case "cap_c":
      return "Who made the capture?"
    case "cap_t":
      return "Which character did they play?"
    case "cap_n":
      return step.capturingCard === "pirate"
        ? `How many mermaids were captured? (max ${MAX_MERMAIDS_IN_GAME})`
        : `How many pirates were captured? (max ${MAX_PIRATES_IN_GAME})`
    case "fb_p":
      return "Who scores the 14 bonus?"
    case "fb_s":
      return "Which suit is the 14?"
    default: {
      const _e: never = step
      return _e
    }
  }
}

type HubView = "list" | "add"

export function EventsDialog({ open, onOpenChange, defaultHub = "list", trigger }: EventsDialogProps) {
  const config = useRoundScoreStore((s) => s.config)
  const currentRoundIndex = useRoundScoreStore((s) => s.currentRoundIndex)
  const rounds = useRoundScoreStore((s) => s.rounds)
  const addEvent = useRoundScoreStore((s) => s.addEvent)
  const addEventToPlayerIndices = useRoundScoreStore((s) => s.addEventToPlayerIndices)
  const applyHarryGiantBidDelta = useRoundScoreStore((s) => s.applyHarryGiantBidDelta)
  const removeEvent = useRoundScoreStore((s) => s.removeEvent)
  const removeAlliancePair = useRoundScoreStore((s) => s.removeAlliancePair)

  const [hub, setHub] = React.useState<HubView>("list")
  const [step, setStep] = React.useState<Step>({ t: "menu" })
  const players = config?.players ?? []
  const named = namedPlayerIndices(players)
  const addable = getAddableEventKinds(config)
  const hasNamed = players.some((p) => nameEqualityKey(p) !== "")
  const currentRound = rounds[currentRoundIndex]
  const roundBidsComplete =
    config != null && currentRound != null ? areAllNamedPlayersBidsSet(config, currentRound) : false
  const canAddEvent = hasNamed && roundBidsComplete
  const addDisabledTitle = !hasNamed
    ? "Name at least one player in setup to add events"
    : !roundBidsComplete
      ? "Set everyone’s bids for this round before adding events"
      : undefined

  const eventLog = React.useMemo(
    () => (currentRound != null ? getRoundEventLogEntries(currentRound, players) : []),
    [currentRound, players],
  )

  const dialogWasOpenRef = React.useRef(false)
  React.useEffect(() => {
    if (open) {
      if (!dialogWasOpenRef.current) {
        const hubToUse = defaultHub === "add" && !canAddEvent ? "list" : defaultHub
        setHub(hubToUse)
        setStep({ t: "menu" })
      }
    } else {
      setStep({ t: "menu" })
    }
    dialogWasOpenRef.current = open
  }, [open, defaultHub, canAddEvent])

  React.useEffect(() => {
    if (open && hub === "add" && !canAddEvent) {
      setHub("list")
      setStep({ t: "menu" })
    }
  }, [open, hub, canAddEvent])

  const goBack = () => {
    setStep((s) => {
      switch (s.t) {
        case "menu":
          return s
        case "al_loot":
          return { t: "menu" }
        case "al_trick":
          return { t: "al_loot" }
        case "pir_o":
          return { t: "menu" }
        case "pir_k":
          return { t: "pir_o" }
        case "pir_v":
          return { t: "pir_k", owner: s.owner }
        case "cap_c":
          return { t: "menu" }
        case "cap_t":
          return { t: "cap_c" }
        case "cap_n":
          return { t: "cap_t", capturer: s.capturer }
        case "fb_p":
          return { t: "menu" }
        case "fb_s":
          return { t: "fb_p" }
        default: {
          const _e: never = s
          return _e
        }
      }
    })
  }

  const handleBack = () => {
    if (hub === "add") {
      if (step.t === "menu") {
        setHub("list")
        return
      }
      goBack()
    }
  }

  const onPickKind = (kind: AddableEventKind) => {
    if (kind === "alliance") setStep({ t: "al_loot" })
    else if (kind === "pirateAbility") setStep({ t: "pir_o" })
    else if (kind === "characterCapture") setStep({ t: "cap_c" })
    else if (kind === "fourteenBonus") setStep({ t: "fb_p" })
  }

  const removeLogEntry = (e: RoundEventLogEntry) => {
    if (e.removal.kind === "single") {
      removeEvent(e.removal.playerIndex, e.removal.eventIndex)
    } else {
      removeAlliancePair(e.removal.lootPlayerIndex, e.removal.trickWinnerIndex)
    }
  }

  const commit = (e: RoundEvent) => {
    if (e.type === "alliance") {
      addEventToPlayerIndices([e.lootPlayerIndex, e.trickWinnerIndex], e)
    } else if (e.type === "pirateAbility") {
      addEvent(e.ownerIndex, e)
    } else if (e.type === "characterCapture") {
      addEvent(e.capturerIndex, e)
    } else if (e.type === "fourteenBonus") {
      addEvent(e.playerIndex, e)
    } else {
      return
    }
    onOpenChange(false)
  }

  const renderPlayerList = (opts: {
    disabled?: (index: number) => boolean
    onPick: (index: number) => void
  }) => (
    <div className={addStyles.playerGrid} role="list">
      {named.map(({ index, name }) => {
        const d = opts.disabled?.(index) ?? false
        return (
          <Button
            key={index}
            type="button"
            variant="eventPlayer"
            disabled={d}
            onClick={() => {
              if (d) return
              opts.onPick(index)
            }}
          >
            {name}
          </Button>
        )
      })}
    </div>
  )

  const body = () => {
    if (step.t === "menu") return null
    if (step.t === "al_loot") {
      return renderPlayerList({ onPick: (loot) => setStep({ t: "al_trick", loot }) })
    }
    if (step.t === "al_trick") {
      return renderPlayerList({
        disabled: (i) => i === step.loot,
        onPick: (trick) =>
          commit({
            type: "alliance",
            lootPlayerIndex: step.loot,
            trickWinnerIndex: trick,
          }),
      })
    }
    if (step.t === "pir_o") {
      return renderPlayerList({ onPick: (owner) => setStep({ t: "pir_k", owner }) })
    }
    if (step.t === "pir_k") {
      return (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="eventOption"
            onClick={() => setStep({ t: "pir_v", owner: step.owner, pirate: "harry" })}
          >
            <strong>Harry the Giant</strong>
            <p>Change your bid by +1, −1, or leave it the same (after winning a trick with this pirate).</p>
          </Button>
          <Button
            type="button"
            variant="eventOption"
            onClick={() => setStep({ t: "pir_v", owner: step.owner, pirate: "rascal" })}
          >
            <strong>Rascal of Roatan</strong>
            <p>Bet 10 or 20 on making your bid; win or lose those points (after winning a trick with this pirate).</p>
          </Button>
        </div>
      )
    }
    if (step.t === "pir_v") {
      if (step.pirate === "harry") {
        return (
          <div className={addStyles.valueRow}>
            {([1, -1] as const).map((d) => (
              <Button
                key={d}
                type="button"
                variant="eventValue"
                onClick={() => {
                  applyHarryGiantBidDelta(step.owner, d)
                  onOpenChange(false)
                }}
              >
                {d === 1 ? "+1" : "−1"}
              </Button>
            ))}
          </div>
        )
      }
      return (
        <div className={addStyles.valueRow}>
          {([10, 20] as const).map((w) => (
            <Button
              key={w}
              type="button"
              variant="eventValue"
              onClick={() =>
                commit({ type: "pirateAbility", ownerIndex: step.owner, pirate: "rascal", wager: w })
              }
            >
              {w}
            </Button>
          ))}
        </div>
      )
    }
    if (step.t === "cap_c") {
      return renderPlayerList({ onPick: (c) => setStep({ t: "cap_t", capturer: c }) })
    }
    if (step.t === "cap_t") {
      const opts = [
        { id: "pirate" as const, label: "Pirate", sub: "Captures a Mermaid" },
        { id: "mermaid" as const, label: "Mermaid", sub: "Captures the Skull King" },
        { id: "king" as const, label: "Skull King", sub: "Captures a Pirate" },
      ]
      return (
        <div className="flex flex-col gap-2">
          {opts.map((o) => (
            <Button
              key={o.id}
              type="button"
              variant="eventOption"
              onClick={() => {
                if (o.id === "mermaid") {
                  commit({
                    type: "characterCapture",
                    capturerIndex: step.capturer,
                    capturingCard: "mermaid",
                    count: 1,
                  })
                  return
                }
                if (o.id === "pirate") {
                  setStep({ t: "cap_n", capturer: step.capturer, capturingCard: "pirate" })
                  return
                }
                setStep({ t: "cap_n", capturer: step.capturer, capturingCard: "king" })
              }}
            >
              <strong>{o.label}</strong>
              <p>{o.sub}</p>
            </Button>
          ))}
        </div>
      )
    }
    if (step.t === "cap_n") {
      const max = step.capturingCard === "pirate" ? MAX_MERMAIDS_IN_GAME : MAX_PIRATES_IN_GAME
      const card = step.capturingCard === "pirate" ? ("pirate" as const) : ("king" as const)
      return (
        <div className={addStyles.valueColumn}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <Button
              key={n}
              type="button"
              variant="eventValue"
              className="w-full"
              onClick={() =>
                commit({
                  type: "characterCapture",
                  capturerIndex: step.capturer,
                  capturingCard: card,
                  count: n,
                })
              }
            >
              {n}
            </Button>
          ))}
        </div>
      )
    }
    if (step.t === "fb_p") {
      return renderPlayerList({ onPick: (p) => setStep({ t: "fb_s", player: p }) })
    }
    if (step.t === "fb_s") {
      return (
        <div className={addStyles.suitRow}>
          {FOURTEEN_SUITS.map((s) => (
            <Button
              key={s}
              type="button"
              variant="eventValue"
              className="capitalize"
              onClick={() => commit({ type: "fourteenBonus", playerIndex: step.player, suit: s })}
            >
              {s}
            </Button>
          ))}
        </div>
      )
    }
    return null
  }

  const renderEventLog = () =>
    eventLog.length === 0 ? (
      <p className={addStyles.emptyMsg}>No events logged yet for this round.</p>
    ) : (
      <ul className={addStyles.eventList}>
        {eventLog.map((e) => (
          <li key={e.key} className={addStyles.eventListItem}>
            <span className={addStyles.eventListTitle}>{e.title}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "-m-px shrink-0 rounded-[var(--radius-sm)] px-px py-px text-muted-foreground hover:bg-[color-mix(in_srgb,var(--destructive),transparent_88%)] hover:text-destructive",
              )}
              aria-label="Remove event"
              onClick={() => removeLogEntry(e)}
            >
              <TrashIcon className="block size-4" />
            </Button>
          </li>
        ))}
      </ul>
    )

  const notInSetupTitle = "Enable this event type in setup"

  const renderKindToolbar = () => (
    <div className={addStyles.kindToolbar} role="group" aria-label="Add event by type">
      {EVENT_KIND_ORDER.map((kind) => {
        const inSetup = addable.includes(kind)
        const enabled = canAddEvent && inSetup
        const title = !canAddEvent ? addDisabledTitle : !inSetup ? notInSetupTitle : undefined
        return (
          <Button
            key={kind}
            type="button"
            variant="kindTile"
            className="h-auto min-h-0 flex-1"
            disabled={!enabled}
            title={title}
            onClick={() => {
              setHub("add")
              onPickKind(kind)
            }}
          >
            <span className={addStyles.kindPlaceholder} aria-hidden />
            <span className={addStyles.kindTileLabel}>{addableEventLabel(kind)}</span>
          </Button>
        )
      })}
    </div>
  )

  /** List view or add-flow menu — show log + toolbar. Sub-steps hide the log and use title/subtitle body only. */
  const atEventHub = hub === "list" || (hub === "add" && step.t === "menu")
  const showKindToolbar = atEventHub
  const dialogTitle = atEventHub ? "Events" : stepTitle(step)
  const listDesc = "Chronological log for this round (oldest first when times are available)."
  const addDesc = stepSubtitle(step)
  const describedBy =
    atEventHub ? "events-hub-desc" : addDesc != null ? "add-event-desc" : undefined
  const showBack = hub === "add" && step.t !== "menu"

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger != null ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content aria-describedby={describedBy}>
          <Dialog.Title>{dialogTitle}</Dialog.Title>
          {atEventHub ? (
            <Dialog.Description id="events-hub-desc">{listDesc}</Dialog.Description>
          ) : addDesc != null ? (
            <Dialog.Description id="add-event-desc">{addDesc}</Dialog.Description>
          ) : null}
          <form
            className={addStyles.formSubmitDisplayContents}
            onSubmit={(e) => {
              e.preventDefault()
              onOpenChange(false)
            }}
          >
            <div className={addStyles.modalStack}>
              {atEventHub ? <div className={addStyles.logSection}>{renderEventLog()}</div> : null}
              <div className={addStyles.bottomSection}>
                {showKindToolbar ? renderKindToolbar() : body()}
              </div>
            </div>
            <Dialog.Footer>
              {showBack ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" variant="outline" size="sm">
                Cancel
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
