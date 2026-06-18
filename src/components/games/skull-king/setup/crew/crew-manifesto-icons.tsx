import type { IconProps } from "@/components/icons/icon-props"
import { Minus, Plus, Trash2 } from "lucide-react"

const stroke = 1.25 as const

export function MinusIcon({ className }: IconProps) {
  return <Minus className={className} strokeWidth={stroke} aria-hidden />
}

export function PlusIcon({ className }: IconProps) {
  return <Plus className={className} strokeWidth={stroke} aria-hidden />
}

export function TrashIcon({ className }: IconProps) {
  return <Trash2 className={className} strokeWidth={stroke} aria-hidden />
}
