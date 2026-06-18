"use client"

import * as React from "react"

/** Visual viewport height at or below this: omit bottom navigation (cramped / keyboard overlap). */
export const WIZARD_FOOTER_HIDE_BELOW_PX = 300

/**
 * Visual viewport height at or below this: place footer inside the scroll region so it can be
 * scrolled into view (e.g. mobile software keyboard) instead of docking under the step strip.
 */
export const WIZARD_FOOTER_IN_FLOW_BELOW_PX = 520

export type WizardFooterLayoutMode = "hidden" | "inFlow" | "docked"

function modeFromVisualHeight(px: number): WizardFooterLayoutMode {
  if (px <= WIZARD_FOOTER_HIDE_BELOW_PX) return "hidden"
  if (px <= WIZARD_FOOTER_IN_FLOW_BELOW_PX) return "inFlow"
  return "docked"
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {}

  const vv = window.visualViewport
  const onEvt = () => {
    onChange()
  }
  vv?.addEventListener("resize", onEvt)
  vv?.addEventListener("scroll", onEvt)
  window.addEventListener("resize", onEvt)
  return () => {
    vv?.removeEventListener("resize", onEvt)
    vv?.removeEventListener("scroll", onEvt)
    window.removeEventListener("resize", onEvt)
  }
}

function getModeSnapshot(): WizardFooterLayoutMode {
  const h = window.visualViewport?.height ?? window.innerHeight
  return modeFromVisualHeight(h)
}

/**
 * Layout mode for wizard footers from visual viewport height only (no device heuristics).
 * - docked: footer stays under the scroll area with fixed footprint
 * - inFlow: footer is rendered after step content so the scroll area can reveal it
 * - hidden: footer omitted when the visible viewport is extremely short
 */
export function useWizardFooterLayoutMode(): WizardFooterLayoutMode {
  return React.useSyncExternalStore(subscribe, getModeSnapshot, () => "docked")
}
