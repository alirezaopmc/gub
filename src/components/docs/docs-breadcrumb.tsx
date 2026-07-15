import Link from "next/link"

import type { DocBreadcrumb } from "@/lib/docs/types"
import { cn } from "@/lib/utils"

type DocsBreadcrumbProps = {
  items: DocBreadcrumb[]
  className?: string
}

export function DocsBreadcrumb({ items, className }: DocsBreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4 text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden className="text-border">/</span> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && "text-foreground")}>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
