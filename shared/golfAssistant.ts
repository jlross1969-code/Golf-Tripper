export type GolfAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export const GOLF_ASSISTANT_HISTORY_LIMIT = 10;

export function recentGolfAssistantMessages(
  messages: GolfAssistantMessage[],
  limit = GOLF_ASSISTANT_HISTORY_LIMIT,
): GolfAssistantMessage[] {
  return messages.slice(-limit);
}
