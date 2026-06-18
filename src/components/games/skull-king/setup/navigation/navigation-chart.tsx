"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { useSetupInteractionOptional } from "@/components/games/skull-king/setup/setup-interaction-context"
import { useWizardKeyboardRequestAdvance } from "@/components/games/skull-king/setup/wizard-keyboard-context"
import { SkullKingSetupSection } from "@/components/games/skull-king/setup/shared/skull-king-setup-section"
import panel from "@/components/games/skull-king/setup/styles/setup-panel.module.css"
import {
  formatRoundsSchema,
  parseRoundsSchemaInput,
  ROUNDS_SCHEMA_PRESETS,
  roundsSchemasEqual,
  type RoundsSchemaPresetId,
} from "@/lib/games/skull-king/rounds-schema"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"

const HINT_ID = "navigation-chart-schema-hint"
const INPUT_ID = "navigation-chart-round-schema"
const HEADING_ID = "navigation-chart-heading"

const ROUND_SCHEMA_PRESET_ORDER: RoundsSchemaPresetId[] = ["default", "odds", "evens", "rich"]

const ROUND_SCHEMA_PRESET_LABEL: Record<RoundsSchemaPresetId, string> = {
  default: "Default",
  odds: "Odds",
  evens: "Evens",
  rich: "Rich",
}

export function NavigationChart() {
  const requestAdvance = useWizardKeyboardRequestAdvance()
  const interaction = useSetupInteractionOptional()
  const markNav = interaction?.markNavInputsTouched

  const roundsSchema = useSkullKingStore((s) => s.roundsSchema)
  const setRoundsSchema = useSkullKingStore((s) => s.setRoundsSchema)

  const [text, setText] = React.useState(() => formatRoundsSchema(roundsSchema))

  React.useEffect(() => {
    setText(formatRoundsSchema(roundsSchema))
  }, [roundsSchema])

  const commitFromRaw = (raw: string) => {
    const parsed = parseRoundsSchemaInput(raw)
    if (parsed.length > 0) {
      setRoundsSchema(parsed)
    } else {
      setText(formatRoundsSchema(useSkullKingStore.getState().roundsSchema))
    }
  }

  return (
    <SkullKingSetupSection
      headingId={HEADING_ID}
      title="Navigation Chart"
      subtitle="Define the length and intensity of the rounds."
      hideTitle
    >
      <div className={panel.sectionFields}>
        <div className={panel.field}>
          <label htmlFor={INPUT_ID} className={panel.label}>
            Round schema
          </label>
          <input
            id={INPUT_ID}
            type="text"
            name="roundSchema"
            value={text}
            onChange={(e) => {
              markNav?.()
              setText(e.target.value)
            }}
            onFocus={() => markNav?.()}
            onBlur={(e) => {
              markNav?.()
              commitFromRaw(e.currentTarget.value)
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return
              e.preventDefault()
              const raw = e.currentTarget.value
              const parsed = parseRoundsSchemaInput(raw)
              commitFromRaw(raw)
              requestAdvance?.(
                parsed.length > 0 ? { navigationCommitted: parsed } : undefined,
              )
            }}
            autoComplete="off"
            aria-describedby={HINT_ID}
            className={panel.textInput}
          />
          <p id={HINT_ID} className={panel.hint}>
            Example: &ldquo;1,2,2,5,5&rdquo; for a shortened skirmish.
          </p>
          <div className={panel.schemaPresets} role="group" aria-label="Round schema presets">
            {ROUND_SCHEMA_PRESET_ORDER.map((presetId) => {
              const next = [...ROUNDS_SCHEMA_PRESETS[presetId]]
              const active = roundsSchemasEqual(roundsSchema, next)
              const valuesText = formatRoundsSchema(next)
              const label = ROUND_SCHEMA_PRESET_LABEL[presetId]
              return (
                <div key={presetId} className={panel.schemaPresetRow}>
                  <div className={panel.schemaPresetButtonSlot}>
                    <Button
                      type="button"
                      variant={active ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={active}
                      aria-label={`${label}: ${valuesText}`}
                      onClick={() => {
                        markNav?.()
                        setRoundsSchema(next)
                        setText(valuesText)
                      }}
                    >
                      {label}
                    </Button>
                  </div>
                  <span className={panel.schemaPresetValuesHint}>{valuesText}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </SkullKingSetupSection>
  )
}
