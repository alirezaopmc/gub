"use client";

import {
  ThemeColorSync,
  ThemeProvider,
  Toaster,
  TokenProvider,
} from "@manovaspace/ui";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TokenProvider>
      <ThemeProvider defaultTheme="dark">
        <ThemeColorSync />
        <Toaster />
        {children}
      </ThemeProvider>
    </TokenProvider>
  );
}
