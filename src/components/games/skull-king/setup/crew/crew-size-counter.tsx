"use client"

import { Button } from "@/components/ui/button"

import { MinusIcon, PlusIcon } from "@/components/games/skull-king/setup/crew/crew-manifesto-icons"
import crew from "@/components/games/skull-king/setup/styles/crew-manifesto.module.css"
import { MAX_CREW_PLAYERS, MIN_CREW_PLAYERS } from "@/lib/games/skull-king/setup/crew-manifest-types"

type CrewSizeCounterProps = {
  count: number
  onSetCount: (next: number) => void
  labelId: string
  /** Called when crew size stepper is used (counts as crew-step interaction). */
  onInteract?: () => void
}

export function CrewSizeCounter({ count, onSetCount, labelId, onInteract }: CrewSizeCounterProps) {
  const atMin = count <= MIN_CREW_PLAYERS
  const atMax = count >= MAX_CREW_PLAYERS

  return (
    <div className={crew.crewSizeCounter} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={crew.crewSizeLabel}>
        Crew Size
      </p>
      <div className={crew.crewSizeStepper}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={crew.crewSizeStepBtn}
          disabled={atMin}
          onClick={() => {
            onInteract?.()
            onSetCount(count - 1)
          }}
          aria-label={`Decrease crew size, current ${count}`}
        >
          <MinusIcon className={crew.crewSizeStepIcon} />
        </Button>
        <output className={crew.crewSizeValue} aria-live="polite" aria-atomic>
          {count}
        </output>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={crew.crewSizeStepBtn}
          disabled={atMax}
          onClick={() => {
            onInteract?.()
            onSetCount(count + 1)
          }}
          aria-label={`Increase crew size, current ${count}`}
        >
          <PlusIcon className={crew.crewSizeStepIcon} />
        </Button>
      </div>
    </div>
  )
}
