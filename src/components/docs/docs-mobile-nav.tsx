"use client";

import {
  Button,
  Menu,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@manovaspace/ui";
import { useEffect, useState } from "react";

import { ArtifactFilter } from "@/components/docs/artifact-filter";
import { DocsNav } from "@/components/docs/docs-nav";
import type { DocNavConfig } from "@/lib/docs/types";

type DocsMobileNavProps = {
  config: DocNavConfig;
};

export function DocsMobileNav({ config }: DocsMobileNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-label text-xs uppercase tracking-wide lg:hidden"
          aria-label="Open documentation menu"
        >
          <Menu className="size-4" aria-hidden />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetTitle>Documentation</SheetTitle>
        <ArtifactFilter />
        <DocsNav config={config} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
