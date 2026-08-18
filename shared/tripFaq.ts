export const TRIP_FAQ_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "schedule", label: "Schedule" },
  { value: "travel", label: "Travel" },
  { value: "accommodation", label: "Accommodation" },
  { value: "local_rules", label: "Local Rules" },
  { value: "scoring", label: "Scoring" },
] as const;

export type TripFaqCategory = (typeof TRIP_FAQ_CATEGORIES)[number]["value"];

export function tripFaqCategoryLabel(category: string): string {
  return TRIP_FAQ_CATEGORIES.find((entry) => entry.value === category)?.label ?? "General";
}
