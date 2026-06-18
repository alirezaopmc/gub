"use client"

import * as React from "react"
import { Dialog as RadixDialog } from "radix-ui"

import { cn } from "@/lib/utils"

import styles from "./dialog.module.css"

function Overlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>) {
  return (
    <RadixDialog.Overlay className={cn(styles.overlay, "gub-dialog-overlay", className)} {...props} />
  )
}

function Content({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Content className={cn(styles.content, "gub-dialog-content", className)} {...props} />
  )
}

function Title({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className={cn(styles.title, className)} {...props} />
}

function Description({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className={cn(styles.subtitle, className)} {...props} />
}

/** Bottom action row — space-between toolbar (e.g. Back / Cancel–Done). */
function Footer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(styles.footer, className)} {...props} />
}

export type DialogRootProps = React.ComponentProps<typeof RadixDialog.Root> & {
  /**
   * When true (default), opening the dialog pushes a history state so mobile / browser Back
   * closes the dialog before navigating away. Disable for dialogs that are real routes.
   */
  syncHistoryOnOpen?: boolean
}

function DialogRoot({ syncHistoryOnOpen = true, onOpenChange, ...props }: DialogRootProps) {
  const open = props.open
  const pushedRef = React.useRef(false)
  const onOpenChangeRef = React.useRef(onOpenChange)
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next && pushedRef.current && syncHistoryOnOpen && typeof window !== "undefined") {
        pushedRef.current = false
        window.history.back()
      }
      onOpenChange?.(next)
    },
    [onOpenChange, syncHistoryOnOpen],
  )

  React.useEffect(() => {
    if (!syncHistoryOnOpen || typeof window === "undefined") return
    if (open !== true) return

    pushedRef.current = true
    window.history.pushState({ gubDialog: true }, "", window.location.href)

    const onPop = () => {
      if (!pushedRef.current) return
      pushedRef.current = false
      onOpenChangeRef.current?.(false)
    }

    window.addEventListener("popstate", onPop)
    return () => {
      window.removeEventListener("popstate", onPop)
    }
  }, [open, syncHistoryOnOpen])

  return <RadixDialog.Root {...props} onOpenChange={handleOpenChange} />
}

export const Dialog = {
  Root: DialogRoot,
  Portal: RadixDialog.Portal,
  Trigger: RadixDialog.Trigger,
  Close: RadixDialog.Close,
  Overlay,
  Content,
  Title,
  Description,
  Footer,
}
