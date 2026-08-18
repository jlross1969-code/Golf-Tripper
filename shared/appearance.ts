export const APP_COLOR_SCHEME_IDS = ["system", "fairway", "ocean", "plum", "sand"] as const;
export type AppColorScheme = typeof APP_COLOR_SCHEME_IDS[number];

export function resolveAppColorScheme(value: string | null | undefined): AppColorScheme {
  return (APP_COLOR_SCHEME_IDS as readonly string[]).includes(value ?? "") ? value as AppColorScheme : "fairway";
}

/** Maps the system preference to one of the concrete app palettes. */
export function resolveEffectiveAppColorScheme(scheme: AppColorScheme, systemPrefersDark: boolean): Exclude<AppColorScheme, "system"> {
  if (scheme !== "system") return scheme;
  return systemPrefersDark ? "fairway" : "sand";
}
