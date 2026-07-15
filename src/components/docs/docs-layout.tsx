import type { ReactNode } from "react"

import { DocsBreadcrumb } from "@/components/docs/docs-breadcrumb"
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav"
import { DocsNav } from "@/components/docs/docs-nav"
import { DocsSearch } from "@/components/docs/docs-search"
import { DocsTOC } from "@/components/docs/docs-toc"
import type { DocBreadcrumb, DocHeading, DocNavConfig } from "@/lib/docs/types"
import { cn } from "@/lib/utils"

type DocsLayoutProps = {
  config: DocNavConfig
  breadcrumbs: DocBreadcrumb[]
  headings?: DocHeading[]
  children: ReactNode
  className?: string
}

export function DocsLayout({
  config,
  breadcrumbs,
  headings = [],
  children,
  className,
}: DocsLayoutProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-6">
        <DocsMobileNav config={config} />
        <p className="truncate font-headline text-sm font-semibold text-primary lg:hidden">
          {config.gameTitle} docs
        </p>
        {config.gameId ? <DocsSearch gameId={config.gameId} /> : null}
      </div>

      <div className="mx-auto flex w-full min-w-0 flex-1 gap-0 px-4 py-6 lg:grid lg:max-w-none lg:grid-cols-[15rem_minmax(0,1fr)_12.5rem] lg:gap-8 lg:px-6">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2">
            <DocsNav config={config} />
          </div>
        </aside>

        <main id="docs-main-content" className="min-w-0 max-w-prose justify-self-center lg:w-full">
          <DocsBreadcrumb items={breadcrumbs} />
          {headings.length > 0 ? (
            <DocsTOC headings={headings} contentRootId="docs-main-content" variant="mobile" />
          ) : null}
          {children}
        </main>

        {headings.length > 0 ? (
          <DocsTOC headings={headings} contentRootId="docs-main-content" variant="desktop" />
        ) : null}
      </div>
    </div>
  )
}
