export type CountbackDirection = "higher" | "lower";

export type CountbackInput = {
  holeNumber: number;
  value: number | null | undefined;
};

export type CountbackBreakdown = {
  back9: number | null;
  last6: number | null;
  last3: number | null;
  hole18: number | null;
};

const SEGMENTS: Array<[keyof CountbackBreakdown, number[]]> = [
  ["back9", [10, 11, 12, 13, 14, 15, 16, 17, 18]],
  ["last6", [13, 14, 15, 16, 17, 18]],
  ["last3", [16, 17, 18]],
  ["hole18", [18]],
];

/**
 * Standard golf countback: back nine, final six, final three, then hole 18.
 * A segment is unavailable until every one of its holes has a result, avoiding
 * premature tie-breaks while a round is still in progress.
 */
export function calculateCountback(values: CountbackInput[]): CountbackBreakdown {
  const byHole = new Map(values.map((entry) => [entry.holeNumber, entry.value ?? null]));
  const result: Partial<CountbackBreakdown> = {};

  for (const [key, holes] of SEGMENTS) {
    const segment = holes.map((holeNumber) => byHole.get(holeNumber) ?? null);
    result[key] = segment.every((value) => value !== null)
      ? segment.reduce((sum, value) => sum + (value ?? 0), 0)
      : null;
  }

  return result as CountbackBreakdown;
}

/** Returns a sort comparison using the first available standard countback segment. */
export function compareCountback(
  left: CountbackBreakdown,
  right: CountbackBreakdown,
  direction: CountbackDirection,
): number {
  for (const key of ["back9", "last6", "last3", "hole18"] as const) {
    const leftValue = left[key];
    const rightValue = right[key];
    if (leftValue === null || rightValue === null || leftValue === rightValue) continue;
    return direction === "higher" ? rightValue - leftValue : leftValue - rightValue;
  }
  return 0;
}

export function countbackLabel(countback: CountbackBreakdown): string {
  const labels: Array<[string, number | null]> = [
    ["B9", countback.back9],
    ["L6", countback.last6],
    ["L3", countback.last3],
    ["18", countback.hole18],
  ];
  return labels.filter(([, value]) => value !== null).map(([label, value]) => `${label} ${value}`).join(" · ");
}
