export type FaqVisibilityEntry = { visibleFromRoundId: number | null };
export type FaqVisibilityRound = { id: number; roundDate: Date | string };

export function isTripFaqVisibleForRound(
  faq: FaqVisibilityEntry,
  rounds: FaqVisibilityRound[],
  activeRoundId?: number | null,
) {
  if (!faq.visibleFromRoundId) return true;
  if (!activeRoundId) return false;
  const orderedIds = [...rounds]
    .sort((left, right) => new Date(left.roundDate).getTime() - new Date(right.roundDate).getTime())
    .map((round) => round.id);
  const visibleFromIndex = orderedIds.indexOf(faq.visibleFromRoundId);
  const activeIndex = orderedIds.indexOf(activeRoundId);
  return visibleFromIndex >= 0 && activeIndex >= visibleFromIndex;
}

export function filterTripFaqsForRound<T extends FaqVisibilityEntry>(
  faqs: T[],
  rounds: FaqVisibilityRound[],
  activeRoundId?: number | null,
) {
  return faqs.filter((faq) => isTripFaqVisibleForRound(faq, rounds, activeRoundId));
}
