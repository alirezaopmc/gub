"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Collapsible } from "radix-ui"
import { ChevronDown } from "lucide-react"

import type { DocNavConfig } from "@/lib/docs/types"
import { cn } from "@/lib/utils"

import styles from "./styles/docs-layout.module.css"

type DocsNavProps = {
  config: DocNavConfig
  className?: string
  onNavigate?: () => void
}

function resolveActiveHref(pathname: string | null, config: DocNavConfig): string | null {
  if (!pathname) return null
  return config.activePathAliases?.[pathname] ?? pathname
}

function isActivePath(pathname: string | null, href: string, config: DocNavConfig): boolean {
  const active = resolveActiveHref(pathname, config)
  if (!active) return false
  return active === href || active.startsWith(`${href}/`)
}

function groupHasActive(pathname: string | null, config: DocNavConfig, section: string): boolean {
  const group = config.groups.find((g) => g.section === section)
  if (!group) return false
  return group.items.some((item) => isActivePath(pathname, item.href, config))
}

export function DocsNav({ config, className, onNavigate }: DocsNavProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Documentation" className={cn("flex flex-col gap-4", className)}>
      <p className="px-2 font-headline text-xs font-bold uppercase tracking-wider text-primary">
        {config.gameTitle}
      </p>
      {config.groups.map((group) => {
        const defaultOpen = groupHasActive(pathname, config, group.section)

        return (
          <Collapsible.Root key={group.section} defaultOpen={defaultOpen}>
            <Collapsible.Trigger className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-foreground hover:bg-muted/50 data-[state=open]:[&_svg]:rotate-180">
              <span>{group.label}</span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-[180ms] ease-in-out"
                aria-hidden
              />
            </Collapsible.Trigger>
            <Collapsible.Content className={styles.navGroupContent}>
              <ul className="mt-1 flex flex-col gap-0.5 pb-1 pl-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href, config)

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Collapsible.Content>
          </Collapsible.Root>
        )
      })}
    </nav>
  )
}
