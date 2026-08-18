export type AssistantFaq = { question: string; answer: string; category?: string; isPinned?: boolean };

export function createAssistantConversationTitle(question: string): string {
  const normalised = question.replace(/\s+/g, " ").trim();
  if (normalised.length <= 72) return normalised || "Golf Trip question";
  return `${normalised.slice(0, 69).trimEnd()}…`;
}

export function formatTripFaqContext(faqs: AssistantFaq[]): string {
  if (faqs.length === 0) return "";
  return `\n\nTrip FAQs supplied by the administrator (treat these as trip-specific guidance; prioritise entries marked Pinned):\n${faqs
    .map((faq, index) => `${index + 1}. [${faq.isPinned ? "Pinned · " : ""}${faq.category ?? "general"}] Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n")}`;
}
