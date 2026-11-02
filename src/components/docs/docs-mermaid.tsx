"use client";

import { useEffect, useId, useRef } from "react";

type DocsMermaidProps = {
  chart: string;
};

export function DocsMermaid({ chart }: DocsMermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    void import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        // Mermaid 12 defaults to the neo look and the ELK layout; keep the
        // rendering these docs had before the upgrade.
        look: "classic",
        layout: "dagre",
        securityLevel: "strict",
        fontFamily: "var(--font-sans)",
      });

      const { svg } = await mermaid.render(`docs-mermaid-${id}`, chart);
      if (!cancelled) el.innerHTML = svg;
    });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <div
      ref={containerRef}
      className="not-prose my-6 overflow-x-auto rounded-lg border border-border bg-card/40 p-4"
      aria-label="Diagram"
    />
  );
}
