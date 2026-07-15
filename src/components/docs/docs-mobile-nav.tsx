"use client"

import { useEffect, useState } from "react"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet } from "@/components/ui/sheet"
import { DocsNav } from "@/components/docs/docs-nav"
import type { DocNavConfig } from "@/lib/docs/types"

type DocsMobileNavProps = {
  config: DocNavConfig
}

export function DocsMobileNav({ config }: DocsMobileNavProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <Sheet.Root open={open} onOpenChange={setOpen}>
      <Sheet.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-label text-xs uppercase tracking-wide lg:hidden"
          aria-label="Open documentation menu"
        >
          <Menu className="size-4" aria-hidden />
          Menu
        </Button>
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.Overlay />
        <Sheet.Content aria-describedby={undefined}>
          <Sheet.Title>Documentation</Sheet.Title>
          <DocsNav config={config} onNavigate={() => setOpen(false)} />
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
