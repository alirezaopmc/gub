import type { ReactNode } from "react"

type DocsProseProps = {
  children: ReactNode
  className?: string
}

export function DocsProse({ children, className }: DocsProseProps) {
  return (
    <article
      className={[
        "prose prose-gub max-w-none prose-headings:font-headline prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </article>
  )
}
