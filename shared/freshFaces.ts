/**
 * Arranges players into groups so that people who have already played together meet new faces,
 * while keeping group handicap totals reasonably even.
 */
export function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function repeatCost(group: number[], pairCounts: Map<string, number>) {
  let cost = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) cost += (pairCounts.get(pairKey(group[i], group[j])) ?? 0) ** 2;
  }
  return cost;
}

export function arrangeFreshFaces(
  userIds: number[],
  handicaps: Map<number, number>,
  numGroups: number,
  pairCounts: Map<string, number>,
  /** Weight given to evening out handicaps relative to avoiding repeats. */
  balanceWeight = 0.05,
): number[][] {
  const sorted = [...userIds].sort((a, b) => (handicaps.get(a) ?? 0) - (handicaps.get(b) ?? 0) || a - b);
  const groups: number[][] = Array.from({ length: numGroups }, () => []);
  // Snake draft gives a balanced starting point.
  sorted.forEach((id, index) => {
    const row = Math.floor(index / numGroups);
    const col = index % numGroups;
    groups[row % 2 === 0 ? col : numGroups - 1 - col].push(id);
  });

  const total = (group: number[]) => group.reduce((sum, id) => sum + (handicaps.get(id) ?? 0), 0) / Math.max(group.length, 1);
  const mean = userIds.reduce((sum, id) => sum + (handicaps.get(id) ?? 0), 0) / Math.max(userIds.length, 1);
  const score = (group: number[]) => repeatCost(group, pairCounts) + balanceWeight * (total(group) - mean) ** 2;

  // Deterministic hill climb: keep swapping two players between groups while the total cost drops.
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 200) {
    improved = false;
    for (let a = 0; a < numGroups; a++) {
      for (let b = a + 1; b < numGroups; b++) {
        for (let i = 0; i < groups[a].length; i++) {
          for (let j = 0; j < groups[b].length; j++) {
            const before = score(groups[a]) + score(groups[b]);
            [groups[a][i], groups[b][j]] = [groups[b][j], groups[a][i]];
            if (score(groups[a]) + score(groups[b]) < before - 1e-9) improved = true;
            else [groups[a][i], groups[b][j]] = [groups[b][j], groups[a][i]];
          }
        }
      }
    }
  }
  return groups;
}
