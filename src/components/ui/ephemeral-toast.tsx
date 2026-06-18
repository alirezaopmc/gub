"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

export type EphemeralToastVariant = "success" | "info" | "warning" | "destructive"

export type EphemeralToastProps = {
  message: string | null
  variant?: EphemeralToastVariant
  className?: string
}

/** Above modal overlays (e.g. Radix Dialog blur layer ~50); rendered on `document.body` so parent `z-index` (footer shells, etc.) cannot trap it. */
const TOAST_Z = "z-[10000]"

/** Matches `--motion-duration-short` + easing when animations run; fallback if `animationend` never fires. */
const TOAST_EXIT_FALLBACK_MS = 320

const toastPanelLayoutClasses =
  "gub-ephemeral-toast-panel flex items-start gap-3 rounded-xl border-t border-r border-b border-border/90 px-4 py-3 shadow-lg backdrop-blur-md"

/** Inline accents so variant rails/tints work even when Tailwind omits `border-l-*` / `text-*` theme aliases. */
const VARIANT_PANEL: Record<EphemeralToastVariant, React.CSSProperties> = {
  success: {
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    borderLeftColor: "var(--success)",
    backgroundColor: "color-mix(in srgb, var(--success) 12%, var(--card))",
  },
  info: {
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    borderLeftColor: "var(--secondary)",
    backgroundColor: "color-mix(in srgb, var(--secondary) 12%, var(--card))",
  },
  warning: {
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    borderLeftColor: "var(--warning)",
    backgroundColor: "color-mix(in srgb, var(--warning) 12%, var(--card))",
  },
  destructive: {
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    borderLeftColor: "var(--destructive)",
    backgroundColor: "color-mix(in srgb, var(--destructive) 12%, var(--card))",
  },
}

const VARIANT_ICON_COLOR: Record<EphemeralToastVariant, string> = {
  success: "var(--success)",
  info: "var(--secondary)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
}

function ToastSuccessIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 12l2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ToastInfoIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 16v-5M12 8h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ToastWarningIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5l8.66 15H3.34L12 5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ToastDestructiveIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M15 9l-6 6M9 9l6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ToastIcon({ variant }: { variant: EphemeralToastVariant }) {
  const color = VARIANT_ICON_COLOR[variant]
  const cls = "size-5 shrink-0"
  switch (variant) {
    case "success":
      return <ToastSuccessIcon className={cls} style={{ color }} />
    case "warning":
      return <ToastWarningIcon className={cls} style={{ color }} />
    case "destructive":
      return <ToastDestructiveIcon className={cls} style={{ color }} />
    default:
      return <ToastInfoIcon className={cls} style={{ color }} />
  }
}

type ToastLifecycle =
  | { status: "empty" }
  | { status: "shown"; msg: string; v: EphemeralToastVariant }
  | { status: "leaving"; msg: string; v: EphemeralToastVariant }

/** Fixed, auto-dismissing host: parent owns `message` state and timeout. */
export function EphemeralToast({ message, variant = "info", className }: EphemeralToastProps) {
  const [mounted, setMounted] = React.useState(false)
  const [lifecycle, setLifecycle] = React.useState<ToastLifecycle>({ status: "empty" })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (message) {
      setLifecycle({ status: "shown", msg: message, v: variant ?? "info" })
      return
    }
    setLifecycle((prev) =>
      prev.status === "shown" ? { status: "leaving", msg: prev.msg, v: prev.v } : prev,
    )
  }, [message, variant])

  React.useEffect(() => {
    if (lifecycle.status !== "leaving") return
    if (typeof window === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.requestAnimationFrame(() =>
        setLifecycle((prev) => (prev.status === "leaving" ? { status: "empty" } : prev)),
      )
      return () => window.cancelAnimationFrame(id)
    }
    const fallback = window.setTimeout(() => {
      setLifecycle((prev) => (prev.status === "leaving" ? { status: "empty" } : prev))
    }, TOAST_EXIT_FALLBACK_MS)
    return () => window.clearTimeout(fallback)
  }, [lifecycle.status])

  const onToastPanelAnimationEnd = React.useCallback((e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    setLifecycle((prev) => {
      if (prev.status !== "leaving") return prev
      const names = e.animationName.split(",").map((s) => s.trim())
      if (!names.some((n) => n === "gub-toast-out")) return prev
      return { status: "empty" }
    })
  }, [])

  if (!mounted || lifecycle.status === "empty") return null

  const { msg, v } = lifecycle
  const phase = lifecycle.status === "leaving" ? "closing" : "open"
  const isDestructive = v === "destructive"

  return createPortal(
    <div
      className={cn(
        `pointer-events-none fixed bottom-6 left-1/2 ${TOAST_Z} w-[min(100vw-2rem,26rem)] -translate-x-1/2 px-2`,
        className,
      )}
    >
      <div
        role={isDestructive ? "alert" : "status"}
        aria-live={isDestructive ? "assertive" : "polite"}
        data-gub-toast-phase={phase}
        className={toastPanelLayoutClasses}
        style={VARIANT_PANEL[v]}
        onAnimationEnd={onToastPanelAnimationEnd}
      >
        <span className="mt-0.5 shrink-0">
          <ToastIcon variant={v} />
        </span>
        <p className="m-0 min-w-0 flex-1 text-left text-sm leading-snug text-foreground">{msg}</p>
      </div>
    </div>,
    document.body,
  )
}
