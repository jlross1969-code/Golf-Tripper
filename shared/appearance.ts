export const APP_COLOR_SCHEME_IDS = ["fairway", "ocean", "plum", "sand"] as const;
export type AppColorScheme = typeof APP_COLOR_SCHEME_IDS[number];

export function resolveAppColorScheme(value: string | null | undefined): AppColorScheme {
  return (APP_COLOR_SCHEME_IDS as readonly string[]).includes(value ?? "") ? value as AppColorScheme : "fairway";
}
