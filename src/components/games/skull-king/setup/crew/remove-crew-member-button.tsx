import { Button } from "@/components/ui/button"

import { TrashIcon } from "@/components/games/skull-king/setup/crew/crew-manifesto-icons"
import styles from "@/components/games/skull-king/setup/styles/crew-manifesto.module.css"

type RemoveCrewMemberButtonProps = {
  disabled: boolean
  title?: string
  ariaLabel: string
  onRemove: () => void
}

export function RemoveCrewMemberButton({
  disabled,
  title,
  ariaLabel,
  onRemove,
}: RemoveCrewMemberButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      title={title}
      className={styles.removeMemberButton}
      onClick={onRemove}
      aria-label={ariaLabel}
    >
      <TrashIcon className="size-4" />
    </Button>
  )
}
