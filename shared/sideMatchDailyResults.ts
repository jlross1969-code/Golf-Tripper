export type SideMatchDailyPlayer = { userId: number; stableford: number; gross: number; holesPlayed: number };

export function sortSideMatchDailyPlayers<T extends SideMatchDailyPlayer>(type: string, players: T[]) {
  return [...players].sort((a, b) => type === "stroke" ? a.gross - b.gross : b.stableford - a.stableford);
}

export function getSideMatchDailyLeader<T extends SideMatchDailyPlayer>(type: string, players: T[]) {
  const leader = sortSideMatchDailyPlayers(type, players)[0];
  if (!leader || leader.holesPlayed <= 0) return null;
  return { ...leader, value: type === "stroke" ? leader.gross : leader.stableford, label: type === "stroke" ? "gross" : "pts" };
}
