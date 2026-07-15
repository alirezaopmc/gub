"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { loadDocsSearchIndex } from "@/lib/docs/load-docs-search-index"
import { searchDocs } from "@/lib/docs/search-docs"
import type { DocSearchEntry, DocSearchKind } from "@/lib/docs/types"
import { cn } from "@/lib/utils"

import styles from "./styles/docs-search.module.css"

type DocsSearchProps = {
  gameId: string
  className?: string
}

const KIND_LABELS: Record<DocSearchKind, string> = {
  page: "Page",
  heading: "Section",
  glossary: "Glossary",
}

export function DocsSearch({ gameId, className }: DocsSearchProps) {
  const router = useRouter()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [entries, setEntries] = useState<DocSearchEntry[] | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [loadError, setLoadError] = useState(false)

  const results = useMemo(() => {
    if (!entries) return []
    return searchDocs(entries, query)
  }, [entries, query])

  const selectedIndex = Math.min(activeIndex, Math.max(results.length - 1, 0))

  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery("")
    setActiveIndex(0)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        openPalette()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openPalette])

  useEffect(() => {
    if (!open || entries) return

    loadDocsSearchIndex(gameId)
      .then((index) => {
        setEntries(index)
        setLoadError(false)
      })
      .catch(() => {
        setLoadError(true)
      })
  }, [entries, gameId, open])

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])
  const navigateTo = useCallback(
    (entry: DocSearchEntry) => {
      setOpen(false)
      router.push(entry.href)
    },
    [router],
  )

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      navigateTo(results[selectedIndex])
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "font-label text-xs uppercase tracking-wide",
          "lg:ml-auto",
          className,
        )}
        aria-label="Search documentation"
        onClick={openPalette}
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen} syncHistoryOnOpen={false}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={cn(styles.content, "w-[min(100%-1.5rem,32rem)] gap-0")}
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title className="sr-only">Search documentation</Dialog.Title>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search rules, headings, glossary…"
              className={styles.input}
              aria-controls={listId}
              aria-activedescendant={
                results[selectedIndex] ? `${listId}-${selectedIndex}` : undefined
              }
              autoComplete="off"
              spellCheck={false}
            />

            <ul id={listId} className={styles.results} role="listbox">
              {loadError ? (
                <li className={styles.empty}>Could not load search index.</li>
              ) : !entries ? (
                <li className={styles.empty}>Loading…</li>
              ) : query && results.length === 0 ? (
                <li className={styles.empty}>No results for “{query}”.</li>
              ) : results.length === 0 ? (
                <li className={styles.empty}>Type to search documentation.</li>
              ) : (
                results.map((entry, index) => (
                  <li
                    key={entry.id}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={styles.result}
                    data-active={index === selectedIndex ? "true" : "false"}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => navigateTo(entry)}
                  >
                    <span className={styles.kind}>{KIND_LABELS[entry.kind]}</span>
                    <span className={styles.resultTitle}>{entry.title}</span>
                    {entry.subtitle ? (
                      <span className={styles.resultMeta}>{entry.subtitle}</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
