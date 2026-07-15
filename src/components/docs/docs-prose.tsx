import type { ReactNode } from "react"

type DocsProseProps = {
  children: ReactNode
  className?: string
}

export function DocsProse({ children, className }: DocsProseProps) {
  return (
    <article
      className={[
        "prose prose-gub max-w-none prose-headings:font-headline prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-primary prose-a:font-medium prose-a:underline prose-a:decoration-primary/40 prose-a:underline-offset-2 hover:prose-a:decoration-primary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </article>
  )
}
