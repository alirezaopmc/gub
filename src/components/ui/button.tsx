import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex cursor-pointer shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm active:scale-[0.98]",
        outline:
          "border border-border bg-card/50 text-foreground hover:bg-muted hover:border-border/90 active:scale-[0.98] aria-expanded:bg-muted",
        /** Footer “Redo round” — destructive tinted chip with elevation. */
        outlineReplay:
          "border-destructive/40 bg-destructive/10 text-destructive shadow-[var(--shadow-sk-cta)] hover:border-destructive/70 hover:bg-destructive/20 hover:brightness-105 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:border-border disabled:bg-muted/50 disabled:text-muted-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        inverted:
          "bg-inverted text-inverted-foreground hover:bg-inverted/90 hover:shadow-md active:scale-[0.98] aria-expanded:bg-inverted aria-expanded:text-inverted-foreground disabled:bg-muted disabled:text-muted-foreground",
        /** Skull King vibrant pirate gold CTA (setup / entry). */
        branded:
          "border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 font-headline text-sm font-bold tracking-[0.02em] text-slate-950 shadow-[var(--shadow-sk-cta)] transition-all duration-150 ease-out hover:brightness-105 hover:shadow-[0_4px_16px_rgba(245,158,11,0.35)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-45 disabled:pointer-events-none",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:bg-muted disabled:text-muted-foreground",
        /** Outlined / tinted destructive — irreversible or data-loss actions (confirm in UI copy). */
        caution:
          "border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:border-border disabled:bg-muted/50 disabled:text-muted-foreground",
        link: "text-primary underline-offset-4 shadow-none hover:underline disabled:text-muted-foreground disabled:no-underline",
        /** Skull King add-event toolbar tile. */
        kindTile:
          "min-h-0 h-auto max-h-none shrink-0 min-w-0 flex-1 flex-col gap-[0.35rem] whitespace-normal rounded-[var(--radius-sm)] border border-border bg-[color-mix(in_srgb,var(--muted)_35%,var(--background)_65%)] px-1 py-[0.4rem] text-[0.5625rem] font-bold uppercase leading-snug tracking-wide hover:border-[color-mix(in_srgb,var(--primary),transparent_45%)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--background)_92%)] hover:shadow-[0_0_8px_0_color-mix(in_srgb,var(--primary),transparent_60%)] focus-visible:border-[color-mix(in_srgb,var(--primary),transparent_35%)] focus-visible:ring-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color-mix(in_srgb,var(--primary),transparent_35%)] disabled:cursor-not-allowed disabled:opacity-45",
        /** Add-event stacked option rows (Harry / Rascal cards, capture type …). */
        eventOption:
          "h-auto min-h-0 max-h-none w-full flex-col items-stretch whitespace-normal rounded-[var(--radius-sm)] border border-border bg-background p-2 px-2.5 text-left font-normal normal-case hover:border-[color-mix(in_srgb,var(--primary),transparent_45%)] hover:bg-[color-mix(in_srgb,var(--muted)_30%,var(--background)_70%)] hover:shadow-[0_0_8px_0_color-mix(in_srgb,var(--primary),transparent_60%)] focus-visible:border-[color-mix(in_srgb,var(--primary),transparent_35%)] focus-visible:ring-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color-mix(in_srgb,var(--primary),transparent_35%)] [&_strong]:font-sans [&_strong]:my-0 [&_strong]:block [&_strong]:text-[0.8rem] [&_strong]:font-extrabold [&_strong]:uppercase [&_strong]:tracking-wide [&_strong]:text-foreground [&_p]:mx-0 [&_p]:my-2 [&_p]:block [&_p]:text-[0.65rem] [&_p]:leading-snug [&_p]:text-muted-foreground",
        /** Numeric / suit picker chip. */
        eventValue:
          "h-auto min-h-[2.75rem] shrink-0 flex-1 basis-[40%] min-w-[3.25rem] rounded-[var(--radius-sm)] border border-border bg-background px-2 py-2 font-mono text-[0.9rem] font-bold normal-case whitespace-nowrap hover:border-[color-mix(in_srgb,var(--primary),transparent_40%)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--background)_90%)] hover:shadow-[0_0_8px_0_color-mix(in_srgb,var(--primary),transparent_60%)] focus-visible:border-[color-mix(in_srgb,var(--primary),transparent_35%)] focus-visible:ring-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color-mix(in_srgb,var(--primary),transparent_35%)] disabled:opacity-40",
        /** Player pick row — uppercase left-aligned manifesto style. */
        eventPlayer:
          "flex h-auto min-h-0 max-h-none w-full min-w-0 items-center justify-start whitespace-normal rounded-[var(--radius-sm)] border border-border bg-[color-mix(in_srgb,var(--muted)_50%,var(--background)_50%)] px-2.5 py-2 text-left font-sans text-[0.8125rem] font-bold uppercase tracking-wide hover:border-[color-mix(in_srgb,var(--primary),transparent_45%)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--background)_92%)] hover:shadow-[0_0_8px_0_color-mix(in_srgb,var(--primary),transparent_60%)] focus-visible:border-[color-mix(in_srgb,var(--primary),transparent_35%)] focus-visible:ring-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color-mix(in_srgb,var(--primary),transparent_35%)] disabled:cursor-not-allowed disabled:opacity-40",
      },
      size: {
        default:
          "h-10 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1.5 rounded-lg px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-lg px-3 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 rounded-xl px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        /** Full-width primary with optional kicker row (round footer, setup confirm). */
        cta: "h-auto min-h-11 min-w-0 flex-col gap-0.5 rounded-xl px-5 py-2 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10 rounded-xl",
        "icon-xs": "size-8 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
    compoundVariants: [
      // Default size adds a fixed height after variant classes; restore auto height so
      // multi-line event rows (Harry / Rascal, player list, toolbar tiles, value chips)
      // are not clipped (see skull-king add-event-dialog).
      {
        variant: ["eventOption", "eventPlayer", "kindTile", "eventValue"],
        size: "default",
        class: "h-auto",
      },
    ],
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
