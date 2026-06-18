"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

import { CrewMemberField } from "@/components/games/skull-king/setup/crew/crew-member-field"
import crew from "@/components/games/skull-king/setup/styles/crew-manifesto.module.css"
import { cn } from "@/lib/utils"

type SortableCrewMemberRowProps = {
  id: string
  index: number
  name: string
  isDuplicate: boolean
  duplicateHintMessage?: string
  errorsVisible?: boolean
  onCrewNameBlur?: () => void
  canRemove: boolean
  onNameChange: (index: number, name: string) => void
  onRemove: (index: number) => void
  onEnterInNameField?: () => void
}

export function SortableCrewMemberRow({
  id,
  index,
  name,
  isDuplicate,
  duplicateHintMessage,
  errorsVisible,
  onCrewNameBlur,
  canRemove,
  onNameChange,
  onRemove,
  onEnterInNameField,
}: SortableCrewMemberRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(crew.sortableCrewRow, isDragging && crew.sortableCrewRowDragging)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <CrewMemberField
        index={index}
        name={name}
        isDuplicate={isDuplicate}
        duplicateHintMessage={duplicateHintMessage}
        errorsVisible={errorsVisible}
        onCrewNameBlur={onCrewNameBlur}
        canRemove={canRemove}
        onNameChange={onNameChange}
        onRemove={onRemove}
        onEnterKey={onEnterInNameField}
        dragHandle={
          <button
            type="button"
            className={crew.dragHandle}
            aria-label={`Drag to reorder crew member ${index + 1}`}
            {...attributes}
            {...listeners}
            tabIndex={-1}
          >
            <GripVertical aria-hidden className={crew.dragGripIcon} strokeWidth={1.5} />
          </button>
        }
      />
    </div>
  )
}
