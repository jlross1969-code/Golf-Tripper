export type TripAppearanceScheduleLike = { appearanceDate: Date | string; colorScheme: string };

export function localAppearanceDateKey(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-CA");
}

/** Selects a scheduled event-day scheme ahead of the normal trip default. */
export function resolveTripAppearanceForDate(
  schedules: TripAppearanceScheduleLike[],
  fallbackScheme: string | null | undefined,
  date: Date = new Date(),
): string | null | undefined {
  const key = localAppearanceDateKey(date);
  return schedules.find((schedule) => localAppearanceDateKey(schedule.appearanceDate) === key)?.colorScheme ?? fallbackScheme;
}
