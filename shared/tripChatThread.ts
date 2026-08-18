export type ThreadMessage = { id: number; parentMessageId: number | null };

export function groupTripChatThreads<T extends ThreadMessage>(messages: T[]) {
  const repliesByParent = new Map<number, T[]>();
  const roots: T[] = [];
  for (const message of messages) {
    if (message.parentMessageId === null) roots.push(message);
    else repliesByParent.set(message.parentMessageId, [...(repliesByParent.get(message.parentMessageId) ?? []), message]);
  }
  return { roots, repliesByParent };
}
