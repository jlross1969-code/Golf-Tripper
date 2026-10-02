import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { calculateNetScore, calculateStablefordPoints } from "../../../shared/scoring";
import { enqueueScore, isNetworkError, pendingScores, removeScore, subscribeQueue, type QueuedScore } from "@/lib/offlineScoreQueue";

type ScoreInput = Omit<QueuedScore, "queuedAt">;

/**
 * Drop-in replacement for trpc.scores.submit.useMutation(): if the device is offline the score
 * is queued locally and synced later, and a locally computed result is returned.
 */
export function useOfflineScoreSubmit(roundId: number) {
  const submit = trpc.scores.submit.useMutation();
  const utils = trpc.useUtils();
  const flushing = useRef(false);
  const snapshot = useRef<{ key: string; items: QueuedScore[] }>({ key: "[]", items: [] });
  const getItems = useCallback(() => {
    const items = pendingScores(roundId);
    const key = JSON.stringify(items);
    if (key !== snapshot.current.key) snapshot.current = { key, items };
    return snapshot.current.items;
  }, [roundId]);
  const pending = useSyncExternalStore(subscribeQueue, getItems, getItems);

  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return;
    flushing.current = true;
    let synced = 0;
    try {
      for (const item of pendingScores()) {
        const { queuedAt: _queuedAt, ...input } = item;
        try {
          await submit.mutateAsync({ ...input, source: "offline_sync" });
          removeScore(item);
          synced++;
        } catch (error) {
          if (isNetworkError(error)) break; // still offline; try again later
          removeScore(item); // the server rejected it; retrying will not help
          toast.error(`A saved score for hole ${item.holeNumber} was rejected: ${(error as Error).message}`);
        }
      }
    } finally {
      flushing.current = false;
    }
    if (synced > 0) {
      toast.success(`${synced} saved score${synced === 1 ? "" : "s"} synced`);
      utils.scores.invalidate();
      utils.leaderboard.invalidate();
    }
  }, [submit, utils]);

  useEffect(() => {
    void flush();
    window.addEventListener("online", flush);
    const timer = window.setInterval(flush, 30000);
    return () => { window.removeEventListener("online", flush); window.clearInterval(timer); };
  }, [flush]);

  const mutateAsync = async (input: ScoreInput & { source?: "entry" | "offline_sync" }) => {
    try {
      return { ...(await submit.mutateAsync(input)), queued: false as const };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      enqueueScore(input);
      toast.warning("No signal: score saved on this device and will sync automatically");
      const netScore = calculateNetScore(input.grossScore, input.handicap, input.strokeIndex);
      return {
        netScore,
        stablefordPoints: calculateStablefordPoints(netScore, input.par),
        achievementType: undefined,
        mercyCapped: false,
        cappedTo: undefined,
        queued: true as const,
      };
    }
  };

  return { mutateAsync, isPending: submit.isPending, pendingCount: pending.length, flush };
}
