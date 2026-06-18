"use client"

import * as React from "react"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"

import { CrewAddSlot } from "@/components/games/skull-king/setup/crew/crew-add-slot"
import { CrewSizeCounter } from "@/components/games/skull-king/setup/crew/crew-size-counter"
import { SortableCrewMemberRow } from "@/components/games/skull-king/setup/crew/sortable-crew-member-row"
import { useSetupInteractionOptional } from "@/components/games/skull-king/setup/setup-interaction-context"
import { SkullKingSetupSection } from "@/components/games/skull-king/setup/shared/skull-king-setup-section"
import { useWizardKeyboardRequestAdvance } from "@/components/games/skull-king/setup/wizard-keyboard-context"
import crew from "@/components/games/skull-king/setup/styles/crew-manifesto.module.css"
import { crewRowNames } from "@/lib/games/skull-king/crew-row"
import {
  duplicateIndexGroups,
  formatDuplicateCrewMessage,
} from "@/lib/games/skull-king/crew-name-validation"
import { Tooltip } from "radix-ui"
import { MAX_CREW_PLAYERS, MIN_CREW_PLAYERS } from "@/lib/games/skull-king/setup/crew-manifest-types"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"

const CREW_HEADING_ID = "crew-manifesto-heading"
const CREW_SIZE_LABEL_ID = "crew-size-label"

export function CrewManifesto() {
  const requestAdvance = useWizardKeyboardRequestAdvance()
  const interaction = useSetupInteractionOptional()
  const errorsVisible = interaction === null ? true : interaction.crewNameFieldsBlurredOnce
  const markCrewNameFieldBlurred = interaction?.markCrewNameFieldBlurred

  const players = useSkullKingStore((s) => s.players)
  const setPlayerName = useSkullKingStore((s) => s.setPlayerName)
  const setCrewCount = useSkullKingStore((s) => s.setCrewCount)
  const removePlayer = useSkullKingStore((s) => s.removePlayer)
  const reorderPlayers = useSkullKingStore((s) => s.reorderPlayers)

  const nameList = crewRowNames(players)
  const dupGroups = duplicateIndexGroups(nameList)
  const duplicateIndices = new Set<number>()
  for (const g of dupGroups) {
    for (const i of g) duplicateIndices.add(i)
  }
  const dupHintMessage = dupGroups.length === 0 ? undefined : formatDuplicateCrewMessage(dupGroups)
  const canRemoveRow = players.length > MIN_CREW_PLAYERS

  const onAddCrewFromSlot = () => {
    const i = players.length
    if (i >= MAX_CREW_PLAYERS) return
    setCrewCount(i + 1)
    requestAnimationFrame(() => {
      document.getElementById(`crew-name-${i}`)?.focus()
    })
  }

  const onSetCrewCount = (next: number) => {
    setCrewCount(next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over == null || active.id === over.id) return
    const oldIndex = players.findIndex((p) => p.id === String(active.id))
    const newIndex = players.findIndex((p) => p.id === String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    reorderPlayers(oldIndex, newIndex)
  }

  return (
    <SkullKingSetupSection
      headingId={CREW_HEADING_ID}
      title="Crew Manifesto"
      subtitle="Name everyone at the table. You need at least two to set sail."
      hideTitle
    >
      <Tooltip.Provider delayDuration={180}>
        <div className={crew.crewList}>
          <CrewSizeCounter
            count={players.length}
            onSetCount={onSetCrewCount}
            labelId={CREW_SIZE_LABEL_ID}
          />
          <DndContext
            id="sk-crew-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
          <SortableContext
            items={players.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {players.map((row, index) => (
              <SortableCrewMemberRow
                key={row.id}
                id={row.id}
                index={index}
                name={row.name}
                isDuplicate={duplicateIndices.has(index)}
                duplicateHintMessage={
                  errorsVisible && duplicateIndices.has(index) ? dupHintMessage : undefined
                }
                errorsVisible={errorsVisible}
                onCrewNameBlur={markCrewNameFieldBlurred}
                canRemove={canRemoveRow}
                onNameChange={setPlayerName}
                onRemove={removePlayer}
                onEnterInNameField={() => {
                  if (index < players.length - 1) {
                    document.getElementById(`crew-name-${index + 1}`)?.focus()
                  } else {
                    requestAdvance?.()
                  }
                }}
              />
            ))}
          </SortableContext>
          </DndContext>
          <CrewAddSlot currentCount={players.length} onAdd={onAddCrewFromSlot} />
        </div>
      </Tooltip.Provider>
    </SkullKingSetupSection>
  )
}
