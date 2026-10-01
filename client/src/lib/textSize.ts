export type TextSize = "normal" | "large" | "xlarge";

export const TEXT_SIZES: { id: TextSize; label: string; percent: number }[] = [
  { id: "normal", label: "Normal", percent: 100 },
  { id: "large", label: "Large", percent: 118 },
  { id: "xlarge", label: "Extra large", percent: 135 },
];

const KEY = "golf-trip-text-size";

export function getTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(KEY);
    return TEXT_SIZES.some((size) => size.id === stored) ? (stored as TextSize) : "normal";
  } catch {
    return "normal";
  }
}

/** Scales the root font size so every rem-based dimension grows with it. */
export function applyTextSize(size: TextSize) {
  const percent = TEXT_SIZES.find((s) => s.id === size)?.percent ?? 100;
  document.documentElement.style.fontSize = `${percent}%`;
}

export function setTextSize(size: TextSize) {
  try { localStorage.setItem(KEY, size); } catch { /* preference just will not persist */ }
  applyTextSize(size);
}
