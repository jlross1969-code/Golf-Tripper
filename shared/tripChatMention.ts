export function normaliseTripChatMentionedUserIds(ids: number[] | undefined, senderUserId: number) {
  return [...new Set(ids ?? [])]
    .filter((id) => Number.isInteger(id) && id > 0 && id !== senderUserId)
    .slice(0, 10);
}
