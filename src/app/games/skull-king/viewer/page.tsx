"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ViewerHubPage() {
  const router = useRouter();
  const [code, setCode] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length >= 2) {
      router.push(`/games/skull-king/viewer/${cleanCode}`);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-amber-500">
            Table Display Viewer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Spectate a match on a tablet, TV, or shared monitor. Displays cards
            played, scores, and round stats with no hidden data.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label
              className="flex flex-col gap-1 text-sm font-medium"
              htmlFor="viewer-code"
            >
              Match code
              <input
                id="viewer-code"
                type="text"
                required
                minLength={2}
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. ABCDE"
                className="rounded-md border border-border bg-background px-3 py-2 text-xl font-mono uppercase tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <Button
              variant="default"
              size="lg"
              type="submit"
              className="font-bold"
            >
              Open Table Display
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
