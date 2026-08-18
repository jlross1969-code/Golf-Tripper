import type { AppColorScheme } from "./appearance";

export const SEASONAL_APPEARANCE_TEMPLATES: { id: string; name: string; description: string; colorScheme: AppColorScheme }[] = [
  { id: "spring-invitational", name: "Spring Invitational", description: "Fresh fairway greens for a classic club day.", colorScheme: "fairway" },
  { id: "summer-coast", name: "Summer Coast", description: "Cool ocean blues for bright summer rounds.", colorScheme: "ocean" },
  { id: "autumn-classic", name: "Autumn Classic", description: "Warm sand tones for an autumn tour.", colorScheme: "sand" },
  { id: "winter-twilight", name: "Winter Twilight", description: "Deep plum contrast for twilight and winter golf.", colorScheme: "plum" },
];

function utcDay(value: Date | string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Keeps a copied event-day schedule aligned to the corresponding day of another trip. */
export function copyAppearanceDateToTrip(sourceScheduleDate: Date | string, sourceTripStart: Date | string, targetTripStart: Date | string): Date {
  const dayOffset = Math.round((utcDay(sourceScheduleDate) - utcDay(sourceTripStart)) / 86_400_000);
  return new Date(utcDay(targetTripStart) + dayOffset * 86_400_000 + 43_200_000);
}
