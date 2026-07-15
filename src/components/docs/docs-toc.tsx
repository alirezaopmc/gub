"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DocHeading } from "@/lib/docs/types"
import { cn } from "@/lib/utils"

import styles from "./styles/docs-layout.module.css"

type DocsTOCProps = {
  headings: DocHeading[]
  contentRootId?: string
  variant?: "mobile" | "desktop" | "both"
}

function useTocSpy(headings: DocHeading[], contentRootId: string) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (headings.length === 0) return

    const root = document.getElementById(contentRootId)
    if (!root) return

    observerRef.current?.disconnect()

    const visible = new Map<string, IntersectionObserverEntry>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          if (entry.isIntersecting) {
            visible.set(id, entry)
          } else {
            visible.delete(id)
          }
        }

        if (visible.size === 0) return

        const topmost = [...visible.values()].sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0]

        if (topmost?.target.id) {
          setActiveId(topmost.target.id)
        }
      },
      { root: null, rootMargin: "-80px 0px -60% 0px", threshold: [0, 1] },
    )

    for (const heading of headings) {
      const el = root.querySelector(`#${CSS.escape(heading.id)}`)
      if (el) observer.observe(el)
    }

    observerRef.current = observer
    return () => observer.disconnect()
  }, [contentRootId, headings])

  return activeId
}

function TocList({
  headings,
  activeId,
  className,
}: {
  headings: DocHeading[]
  activeId: string | null
  className?: string
}) {
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {headings.map((heading) => (
        <li key={heading.id}>
          <Link
            href={`#${heading.id}`}
            className={cn(
              styles.tocLink,
              heading.level === 3 && styles.tocLinkLevel3,
              activeId === heading.id && styles.tocLinkActive,
            )}
          >
            {heading.text}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function DocsTOC({
  headings,
  contentRootId = "docs-main-content",
  variant = "both",
}: DocsTOCProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeId = useTocSpy(headings, contentRootId)

  if (headings.length === 0) return null

  const showMobile = variant === "mobile" || variant === "both"
  const showDesktop = variant === "desktop" || variant === "both"

  return (
    <>
      {showMobile ? (
        <div className="mb-4 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between font-label text-xs uppercase tracking-wide"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            On this page
            <ChevronDown
              className={cn("size-4 transition-transform", mobileOpen && "rotate-180")}
              aria-hidden
            />
          </Button>
          <div className={styles.mobileTocPanel} data-open={mobileOpen ? "true" : "false"}>
            <TocList
              headings={headings}
              activeId={activeId}
              className="mt-2 rounded-lg border border-border bg-card/50 p-3"
            />
          </div>
        </div>
      ) : null}

      {showDesktop ? (
        <aside className="hidden lg:block" aria-label="On this page">
          <div className={styles.docsRailSticky}>
            <p className="mb-3 font-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            <TocList headings={headings} activeId={activeId} />
          </div>
        </aside>
      ) : null}
    </>
  )
}
