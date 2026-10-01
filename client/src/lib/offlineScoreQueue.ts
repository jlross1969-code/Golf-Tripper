// Scores entered without a connection are kept in localStorage and replayed when the device is back online.
export type QueuedScore = {
  roundId: number;
  userId: number;
  holeId: number;
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossScore: number;
  handicap: number;
  queuedAt: number;
};

const KEY = "golf-trip-offline-scores-v1";
const listeners = new Set<() => void>();

function read(): QueuedScore[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: QueuedScore[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked: nothing more we can do offline.
  }
  listeners.forEach((listener) => listener());
}

const sameHole = (a: QueuedScore, b: QueuedScore) => a.roundId === b.roundId && a.userId === b.userId && a.holeId === b.holeId;

export function enqueueScore(score: Omit<QueuedScore, "queuedAt">) {
  const entry = { ...score, queuedAt: Date.now() };
  // A later entry for the same hole replaces the earlier one.
  write([...read().filter((item) => !sameHole(item, entry)), entry]);
}

export const pendingScores = (roundId?: number) => read().filter((item) => roundId === undefined || item.roundId === roundId);

export function removeScore(score: QueuedScore) {
  write(read().filter((item) => !(sameHole(item, score) && item.queuedAt === score.queuedAt)));
}

export function subscribeQueue(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** True for failures caused by connectivity rather than the server rejecting the request. */
export function isNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const e = error as { data?: { httpStatus?: number } | null; message?: string; cause?: unknown } | null;
  if (e?.data?.httpStatus) return false;
  return e?.cause instanceof TypeError || /failed to fetch|network|load failed/i.test(e?.message ?? "");
}
