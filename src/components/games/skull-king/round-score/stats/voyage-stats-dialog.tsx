"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@manovaspace/ui";
import { ActiveRoundStatsTable } from "@/components/games/skull-king/round-score/stats/active-round-stats-table";
import dialogBody from "@/components/games/skull-king/round-score/styles/stats-dialog.module.css";
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store";

const idDesc = "voyage-stats-dialog-desc";

export type VoyageStatsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VoyageStatsDialog({
  open,
  onOpenChange,
}: VoyageStatsDialogProps) {
  const config = useRoundScoreStore((s) => s.config);
  const rounds = useRoundScoreStore((s) => s.rounds);

  const voyageFinished = rounds.length > 0 && rounds.every((r) => r.finalized);
  const variant = voyageFinished ? "complete" : "active";

  const table =
    config != null && rounds.length > 0 ? (
      <ActiveRoundStatsTable
        players={config.players}
        rounds={rounds}
        variant={variant}
      />
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={idDesc}>
        <DialogTitle>
          {voyageFinished ? "Voyage complete" : "Voyage stats"}
        </DialogTitle>
        <DialogDescription id={idDesc}>
          {voyageFinished
            ? "Final standings: podium medals for the top three ranks (ties share a rank). Highest total score first."
            : "Total points per crew member from every finalized round so far, listed highest score first."}
        </DialogDescription>
        <div className={dialogBody.body}>{table}</div>
        <DialogFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
