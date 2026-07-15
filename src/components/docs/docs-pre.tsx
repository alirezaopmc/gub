import { Children, isValidElement } from "react"
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react"

import { DocsMermaid } from "@/components/docs/docs-mermaid"

function mermaidChartFromPre(children: ReactNode): string | null {
  const child = Children.toArray(children)[0]
  if (!isValidElement(child)) return null

  const code = child as ReactElement<{ className?: string; children?: ReactNode }>
  const className = code.props.className ?? ""
  if (!className.split(/\s+/).includes("language-mermaid")) return null

  return String(code.props.children ?? "").trim()
}

export function DocsPre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const chart = mermaidChartFromPre(children)
  if (chart) return <DocsMermaid chart={chart} />

  return <pre {...props}>{children}</pre>
}
