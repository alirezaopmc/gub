"use client"

import * as React from "react"

/** Optional payload for keyboard advance (e.g. navigation step commits before the store is read). */
export type WizardAdvancePayload = {
  navigationCommitted?: number[]
}

type WizardKeyboardContextValue = {
  /** Continue wizard (steps 1–3) or confirm voyage (step 4) when gates pass — reads latest store state. */
  requestAdvance: (payload?: WizardAdvancePayload) => void
}

const WizardKeyboardContext = React.createContext<WizardKeyboardContextValue | null>(null)

export function WizardKeyboardProvider({
  children,
  requestAdvance,
}: {
  children: React.ReactNode
  requestAdvance: (payload?: WizardAdvancePayload) => void
}) {
  const value = React.useMemo(() => ({ requestAdvance }), [requestAdvance])
  return (
    <WizardKeyboardContext.Provider value={value}>{children}</WizardKeyboardContext.Provider>
  )
}

export function useWizardKeyboardRequestAdvance() {
  return React.useContext(WizardKeyboardContext)?.requestAdvance
}
