"use client"

import { createContext, useContext } from "react"

const DocsLinkContext = createContext<string | null>(null)

export function DocsLinkProvider({
  fromPath,
  children,
}: {
  fromPath: string
  children: React.ReactNode
}) {
  return <DocsLinkContext.Provider value={fromPath}>{children}</DocsLinkContext.Provider>
}

export function useDocsFromPath(): string | null {
  return useContext(DocsLinkContext)
}
