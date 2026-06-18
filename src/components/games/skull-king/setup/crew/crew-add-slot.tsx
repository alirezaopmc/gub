"use client"

import { PlusIcon } from "@/components/games/skull-king/setup/crew/crew-manifesto-icons"
import crew from "@/components/games/skull-king/setup/styles/crew-manifesto.module.css"
import { MAX_CREW_PLAYERS } from "@/lib/games/skull-king/setup/crew-manifest-types"
import { cn } from "@/lib/utils"

type CrewAddSlotProps = {
  currentCount: number
  onAdd: () => void
  onInteract?: () => void
}

/** Faux blank row: neutral / frosted; click adds another seat and focuses the new field. */
export function CrewAddSlot({ currentCount, onAdd, onInteract }: CrewAddSlotProps) {
  if (currentCount >= MAX_CREW_PLAYERS) return null

  return (
    <div className={crew.addCrewRow}>
      <div className={cn(crew.inputRow, crew.inputRowWithDrag)}>
        <button
          type="button"
          className={cn(crew.addCrewTrigger, crew.addCrewTriggerWide)}
          onClick={() => {
            onInteract?.()
            onAdd()
          }}
          aria-label="Add another crew member"
        >
          <span className={crew.addCrewFauxInput}>
            <PlusIcon className={crew.addCrewFauxInputIcon} />
            Add seat
          </span>
        </button>
        <span className={crew.removeSlot} aria-hidden />
      </div>
    </div>
  )
}
