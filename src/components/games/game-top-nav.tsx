"use client"

import Link from "next/link"
import { Home } from "lucide-react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

function titleFromGamesPath(pathname: string | null): string | null {
  if (!pathname?.startsWith("/games/")) return null
  const segment = pathname.slice("/games/".length).split("/")[0] ?? ""
  if (segment.length === 0) return null
  if (segment === "skull-king") return "Skull King"
  return segment
    .split("-")
    .map((p) => p.slice(0, 1).toLocaleUpperCase() + p.slice(1).toLocaleLowerCase())
    .join(" ")
}

export function GameTopNav() {
  const pathname = usePathname()
  const activeGameTitle = titleFromGamesPath(pathname)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <nav
        className="mx-auto grid w-full max-w-3xl grid-cols-[2.25rem_1fr_auto] items-center gap-2 px-6 py-3"
        aria-label="Game"
      >
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-1 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/" aria-label="Go to home">
              <Home className="size-4" aria-hidden strokeWidth={1.5} />
            </Link>
          </Button>
        </div>
        {activeGameTitle ? (
          <p
            className="min-w-0 truncate text-center font-headline text-sm font-bold tracking-wide text-balance text-primary"
            title={activeGameTitle}
          >
            {activeGameTitle}
          </p>
        ) : (
          <div className="min-w-0" />
        )}
        <div className="flex min-w-0 justify-end">
          {pathname?.startsWith("/games/skull-king/") ? (
            <Button
              variant="ghost"
              size="sm"
              className="-mr-1 shrink-0 px-2 font-label text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary"
              asChild
            >
              <Link href="/games/skull-king" aria-label="Skull King hub — continue voyage or start fresh">
                New
              </Link>
            </Button>
          ) : (
            <span aria-hidden className="inline-block w-[2.25rem]" />
          )}
        </div>
      </nav>
    </header>
  )
}
