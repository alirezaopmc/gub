"use client"

import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Tooltip } from "radix-ui"

import { RemoveCrewMemberButton } from "@/components/games/skull-king/setup/crew/remove-crew-member-button"
import crew from "@/components/games/skull-king/setup/styles/crew-manifesto.module.css"
import { crewMemberLabel } from "@/lib/games/skull-king/crew-member-label"
import { MAX_CREW_NAME_LENGTH, MIN_CREW_PLAYERS } from "@/lib/games/skull-king/setup/crew-manifest-types"
import { cn } from "@/lib/utils"

type CrewMemberFieldProps = {
  index: number
  name: string
  isDuplicate: boolean
  /** Full duplicate explanation (same for all colliding rows); tooltip + sr-only. */
  duplicateHintMessage?: string
  /** When false, duplicate styling/message stay hidden (until a name field blurs once in the wizard). Defaults true. */
  errorsVisible?: boolean
  /** Called when the name field loses focus — enables inline/footer validation for step 1. */
  onCrewNameBlur?: () => void
  /** When false, remove is shown but disabled (minimum 2 players). */
  canRemove: boolean
  onNameChange: (index: number, name: string) => void
  onRemove: (index: number) => void
  /** Drag handle (e.g. grip) when using sortable crew list. */
  dragHandle?: ReactNode
  /** Enter key on the name field — focus next row or advance wizard (handled by parent). */
  onEnterKey?: () => void
}

export function CrewMemberField({
  index,
  name,
  isDuplicate,
  duplicateHintMessage,
  errorsVisible = true,
  onCrewNameBlur,
  canRemove,
  onNameChange,
  onRemove,
  dragHandle,
  onEnterKey,
}: CrewMemberFieldProps) {
  const inputId = `crew-name-${index}`
  const dupHintId = `crew-name-${index}-dup-hint`
  const label = crewMemberLabel(index)
  const slot = index + 1
  const isCoreSlot = index < MIN_CREW_PLAYERS
  const showDupError = isDuplicate && errorsVisible
  const showDupTooltip = Boolean(showDupError && duplicateHintMessage)

  return (
    <div className={crew.crewField} data-core-slot={isCoreSlot || undefined}>
      <div className={cn(crew.inputRow, dragHandle ? crew.inputRowWithDrag : undefined)}>
        {dragHandle ? <span className={crew.dragHandleCell}>{dragHandle}</span> : null}
        <span
          className={cn(crew.indexMark, isCoreSlot ? crew.indexMarkCore : crew.indexMarkOptional)}
          title={isCoreSlot ? "Required to play (2 players min.)" : "Optional extra crew slot"}
        >
          #{slot}
        </span>
        <span className={crew.inputCell}>
          <div
            className={cn(
              crew.crewInputShell,
              isCoreSlot ? crew.crewInputShellCore : crew.crewInputShellOptional,
              showDupTooltip && crew.crewInputShellDupPad
            )}
            data-invalid={showDupError || undefined}
          >
            <input
              id={inputId}
              type="text"
              name={`crewMember_${index}`}
              value={name}
              maxLength={MAX_CREW_NAME_LENGTH}
              onChange={(e) => {
                onNameChange(index, e.target.value)
              }}
              onBlur={() => {
                onCrewNameBlur?.()
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return
                e.preventDefault()
                onEnterKey?.()
              }}
              placeholder={isCoreSlot ? "Who sails with you?" : "Optional"}
              autoComplete="off"
              aria-label={
                isCoreSlot ? `Crew member ${slot} name, required` : `Crew member ${slot} name, optional`
              }
              aria-invalid={showDupError}
              aria-describedby={showDupTooltip ? dupHintId : undefined}
              className={crew.crewTextInputInner}
            />
            {showDupTooltip ? (
              <span id={dupHintId} className="sr-only">
                {duplicateHintMessage}
              </span>
            ) : null}
            {showDupTooltip ? (
              <Tooltip.Root delayDuration={180}>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className={crew.inputDupTrigger}
                  >
                    <AlertTriangle aria-hidden strokeWidth={1.75} className={crew.inputDupIcon} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className={crew.dupTooltipContent} side="top" sideOffset={8}>
                    {duplicateHintMessage}
                    <Tooltip.Arrow className={crew.dupTooltipArrow} />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : null}
          </div>
        </span>
        <span className={crew.removeSlot}>
          <RemoveCrewMemberButton
            disabled={!canRemove}
            title={
              canRemove ? undefined : "At least two players are required — remove disabled"
            }
            ariaLabel={
              canRemove
                ? `Remove crew member ${slot} (${label})`
                : `Cannot remove crew member ${slot} — at least two players are required`
            }
            onRemove={() => {
              onRemove(index)
            }}
          />
        </span>
      </div>
    </div>
  )
}
