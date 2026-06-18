"use client"

import * as React from "react"

type SetupInteractionState = {
  /** True after the user has left focus from a crew name field at least once (step 1 validation UX). */
  crewNameFieldsBlurredOnce: boolean
  navInputsTouched: boolean
  markCrewNameFieldBlurred: () => void
  markNavInputsTouched: () => void
}

const SetupInteractionContext = React.createContext<SetupInteractionState | null>(null)

export function SetupInteractionProvider({ children }: { children: React.ReactNode }) {
  const [crewNameFieldsBlurredOnce, setCrewNameFieldsBlurredOnce] = React.useState(false)
  const [navInputsTouched, setNavInputsTouched] = React.useState(false)

  const markCrewNameFieldBlurred = React.useCallback(() => {
    setCrewNameFieldsBlurredOnce(true)
  }, [])

  const markNavInputsTouched = React.useCallback(() => {
    setNavInputsTouched(true)
  }, [])

  const value = React.useMemo(
    (): SetupInteractionState => ({
      crewNameFieldsBlurredOnce,
      navInputsTouched,
      markCrewNameFieldBlurred,
      markNavInputsTouched,
    }),
    [crewNameFieldsBlurredOnce, navInputsTouched, markCrewNameFieldBlurred, markNavInputsTouched]
  )

  return (
    <SetupInteractionContext.Provider value={value}>{children}</SetupInteractionContext.Provider>
  )
}

/** When absent (e.g. component outside wizard), field-level validation UX stays fully visible. */
export function useSetupInteractionOptional() {
  return React.useContext(SetupInteractionContext)
}
