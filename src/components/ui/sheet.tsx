"use client"

import * as React from "react"
import { Dialog as RadixDialog } from "radix-ui"

import { cn } from "@/lib/utils"

import styles from "./sheet.module.css"

function Overlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>) {
  return <RadixDialog.Overlay className={cn(styles.overlay, className)} {...props} />
}

function Content({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Content className={cn(styles.content, className)} {...props}>
      {children}
    </RadixDialog.Content>
  )
}

function Title({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className={cn(styles.title, className)} {...props} />
}

export const Sheet = {
  Root: RadixDialog.Root,
  Portal: RadixDialog.Portal,
  Trigger: RadixDialog.Trigger,
  Close: RadixDialog.Close,
  Overlay,
  Content,
  Title,
}
