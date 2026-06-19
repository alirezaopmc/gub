"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ArtifactsSection } from "@/components/games/skull-king/setup/artifacts/artifacts-section"
import { CrewManifesto } from "@/components/games/skull-king/setup/crew/crew-manifesto"
import { NavigationChart } from "@/components/games/skull-king/setup/navigation/navigation-chart"
import { GameReadyReview } from "@/components/games/skull-king/start/game-ready-review"
import {
  SetupInteractionProvider,
  useSetupInteractionOptional,
} from "@/components/games/skull-king/setup/setup-interaction-context"
import {
  WizardKeyboardProvider,
  type WizardAdvancePayload,
} from "@/components/games/skull-king/setup/wizard-keyboard-context"
import styles from "@/components/games/skull-king/setup/styles/setup-wizard.module.css"
import { Button } from "@/components/ui/button"
import { beginSkullKingVoyageFromSetupIfReady } from "@/lib/games/skull-king/begin-skull-king-voyage-from-setup"
import { saveGameConfig, saveLastArtifactOptions } from "@/lib/games/skull-king/game-config-storage"
import { clampCrewPlayerName } from "@/lib/games/skull-king/crew-name-validation"
import { crewRowNames } from "@/lib/games/skull-king/crew-row"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"
import {
  getCrewStepBlocker,
  getNavigationStepBlocker,
  getSetupStartBlocker,
  setupStartBlockerMessage,
} from "@/lib/games/skull-king/setup-ready"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"
import { WIZARD_STEP_FOCUS_ID } from "@/components/games/skull-king/setup/wizard-step-focus-ids"
import { useWizardFooterLayoutMode } from "@/hooks/use-wizard-footer-layout-mode"

const WIZARD_STEPS = 4 as const
const STEP_QUERY = "step"

const STEP_TITLE_SHORT = ["Crew Manifesto", "Navigation Chart", "Artifacts", "Review & confirm"] as const

function parseWizardStepParam(raw: string | null): {
  step: 1 | 2 | 3 | 4
  needsCanonicalReplace: boolean
} {
  if (raw === null || raw === "") {
    return { step: 1, needsCanonicalReplace: false }
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return { step: 1, needsCanonicalReplace: true }
  }
  if (n < 1) {
    return { step: 1, needsCanonicalReplace: true }
  }
  if (n > 4) {
    return { step: 4, needsCanonicalReplace: true }
  }
  return { step: n as 1 | 2 | 3 | 4, needsCanonicalReplace: false }
}

function buildSetupHref(pathname: string, searchParams: URLSearchParams, step: number): string {
  const next = new URLSearchParams(searchParams.toString())
  next.set(STEP_QUERY, String(step))
  const q = next.toString()
  return q ? `${pathname}?${q}` : pathname
}

/** True when Enter should not trigger wizard-level advance (field/button handlers keep priority). */
function shouldIgnoreEnterForWizardAdvance(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return Boolean(
    target.closest(
      'input, textarea, select, button, a[href], [role="button"], [role="menuitem"]',
    ),
  )
}

export function SkullKingSetupWizard() {
  return (
    <SetupInteractionProvider>
      <SkullKingSetupWizardInner />
    </SetupInteractionProvider>
  )
}

function SkullKingSetupWizardInner() {
  const footerLayoutMode = useWizardFooterLayoutMode()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const interaction = useSetupInteractionOptional()

  const players = useSkullKingStore((s) => s.players)
  const roundsSchema = useSkullKingStore((s) => s.roundsSchema)
  const artifactOptions = useSkullKingStore((s) => s.options)

  const names = crewRowNames(players)

  const rawStep = searchParams.get(STEP_QUERY)
  const { step, needsCanonicalReplace } = parseWizardStepParam(rawStep)

  React.useEffect(() => {
    if (!needsCanonicalReplace) return
    router.replace(buildSetupHref(pathname, searchParams, step), { scroll: false })
  }, [needsCanonicalReplace, pathname, router, searchParams, step])

  /** Move focus to the primary control after each step mounts (steps 1–2 text fields; step 4 confirm/back — artifacts step has no primary text control). */
  React.useLayoutEffect(() => {
    const focusPrimary = () => {
      if (step === 1) {
        document.getElementById(WIZARD_STEP_FOCUS_ID.crewFirstNameInput)?.focus()
        return
      }
      if (step === 2) {
        document.getElementById(WIZARD_STEP_FOCUS_ID.navigationRoundSchemaInput)?.focus()
        return
      }
      if (step === 4) {
        const confirmEl = document.getElementById(WIZARD_STEP_FOCUS_ID.reviewConfirm)
        if (confirmEl instanceof HTMLButtonElement && !confirmEl.disabled) {
          confirmEl.focus()
          return
        }
        document.getElementById(WIZARD_STEP_FOCUS_ID.reviewBack)?.focus()
      }
    }

    queueMicrotask(focusPrimary)
  }, [step])

  const crewBlock = getCrewStepBlocker(names)
  const navBlock = getNavigationStepBlocker(roundsSchema)
  const setupReadyBlock = getSetupStartBlocker(names, roundsSchema)

  const continueBlocker =
    step === 1 ? crewBlock : step === 2 ? navBlock : step === 3 ? setupReadyBlock : null

  const showBlockedFooterHint =
    continueBlocker !== null &&
    Boolean(
      (step === 1 && interaction?.crewNameFieldsBlurredOnce) ||
        (step === 2 && interaction?.navInputsTouched) ||
        step === 3
    )

  const progressPct = (step / WIZARD_STEPS) * 100

  const goBack = () => {
    if (step <= 1) return
    router.push(buildSetupHref(pathname, searchParams, step - 1), { scroll: false })
  }

  const goNext = React.useCallback(
    (payload?: WizardAdvancePayload) => {
      if (step >= WIZARD_STEPS) return
      const names = crewRowNames(useSkullKingStore.getState().players)
      const storeRounds = useSkullKingStore.getState().roundsSchema
      const roundsForNavigationGate =
        step === 2 &&
        payload?.navigationCommitted != null &&
        payload.navigationCommitted.length > 0
          ? payload.navigationCommitted
          : storeRounds
      const blocker =
        step === 1
          ? getCrewStepBlocker(names)
          : step === 2
            ? getNavigationStepBlocker(roundsForNavigationGate)
            : getSetupStartBlocker(names, storeRounds)
      if (blocker !== null) return
      if (step === 3) {
        const config = useSkullKingStore.getState().getGameConfig()
        saveLastArtifactOptions(config.options)
        saveGameConfig(config)
      }
      router.push(buildSetupHref(pathname, searchParams, step + 1), { scroll: false })
    },
    [step, pathname, router, searchParams],
  )

  const confirmReady = setupReadyBlock === null

  const requestAdvance = React.useCallback(
    (payload?: WizardAdvancePayload) => {
      if (step < 4) {
        queueMicrotask(() => goNext(payload))
        return
      }
      if (!beginSkullKingVoyageFromSetupIfReady()) return
      router.push("/games/skull-king/calculator/round")
    },
    [step, goNext, router],
  )

  React.useEffect(() => {
    const onWizardEnterKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return
      if (e.isComposing) return
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.defaultPrevented) return
      if (shouldIgnoreEnterForWizardAdvance(e.target)) return

      if (step <= 3) {
        if (continueBlocker !== null) return
        e.preventDefault()
        goNext()
        return
      }

      if (step === 4) {
        if (!beginSkullKingVoyageFromSetupIfReady()) return
        e.preventDefault()
        router.push("/games/skull-king/calculator/round")
      }
    }

    window.addEventListener("keydown", onWizardEnterKeyDown)
    return () => window.removeEventListener("keydown", onWizardEnterKeyDown)
  }, [step, continueBlocker, goNext, router])

  const continueAriaLabel =
    step === 1
      ? "Continue to navigation chart"
      : step === 2
        ? "Continue to artifacts"
        : step === 3
          ? "Continue to review"
          : "Continue"

  const reviewConfig: SkullKingGameConfig = {
    players: crewRowNames(players).map(clampCrewPlayerName),
    roundsSchema: [...roundsSchema],
    options: { ...artifactOptions },
  }

  const onConfirmRound = () => {
    if (!confirmReady) return
    if (!beginSkullKingVoyageFromSetupIfReady()) return
    router.push("/games/skull-king/calculator/round")
  }

  const showWizardFooter = footerLayoutMode !== "hidden"
  const wizardFooterShellClass =
    footerLayoutMode === "inFlow" ? styles.footerInFlow : styles.footer

  const wizardFooter =
    showWizardFooter ? (
      <div className={wizardFooterShellClass}>
        {step < 4 ? (
          <>
            {showBlockedFooterHint && continueBlocker ? (
              <p className={styles.footerHint} role="status">
                {setupStartBlockerMessage(continueBlocker)}
              </p>
            ) : null}
            <div className={styles.footerActions}>
              <div className={styles.footerRow}>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={step <= 1}
                  onClick={goBack}
                  aria-label="Back to previous setup step"
                >
                  Back
                </Button>
                <div className={styles.footerRowGrow}>
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className="w-full min-w-0"
                    disabled={continueBlocker !== null}
                    onClick={() => goNext()}
                    aria-label={continueAriaLabel}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {setupReadyBlock !== null ? (
              <p className={styles.footerHint} role="status">
                {setupStartBlockerMessage(setupReadyBlock)}
              </p>
            ) : null}
            <div className={styles.footerActions}>
              <div className={styles.footerRow}>
                <Button
                  id={WIZARD_STEP_FOCUS_ID.reviewBack}
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={goBack}
                  aria-label="Back to artifacts"
                >
                  Back
                </Button>
                <div className={styles.footerRowGrow}>
                  <Button
                    id={WIZARD_STEP_FOCUS_ID.reviewConfirm}
                    type="button"
                    variant="default"
                    size="lg"
                    className="w-full min-w-0"
                    disabled={!confirmReady}
                    onClick={onConfirmRound}
                    aria-label="Confirm and go to the round"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    ) : null

  return (
    <WizardKeyboardProvider requestAdvance={requestAdvance}>
    <div className={styles.root}>
      <p className="sr-only" aria-live="polite">
        {`Step ${step} of ${WIZARD_STEPS}, ${STEP_TITLE_SHORT[step - 1]}.`}
      </p>

      <div className={styles.progressWrap}>
        <div className={styles.progressMeta}>
          <p className={styles.stepLine}>
            Step {step} of {WIZARD_STEPS}
          </p>
          <p className={styles.stepTitle}>{STEP_TITLE_SHORT[step - 1]}</p>
        </div>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={WIZARD_STEPS}
          aria-valuenow={step}
          aria-valuetext={`Step ${step} of ${WIZARD_STEPS}`}
          aria-label={`Setup progress, step ${step} of ${WIZARD_STEPS}`}
        >
          <div className={styles.fill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className={styles.scroll}>
        {step === 1 ? <CrewManifesto /> : null}
        {step === 2 ? <NavigationChart /> : null}
        {step === 3 ? <ArtifactsSection /> : null}
        {step === 4 ? <GameReadyReview config={reviewConfig} /> : null}
        {footerLayoutMode === "inFlow" ? wizardFooter : null}
      </div>

      {footerLayoutMode === "docked" ? wizardFooter : null}
    </div>
    </WizardKeyboardProvider>
  )
}
