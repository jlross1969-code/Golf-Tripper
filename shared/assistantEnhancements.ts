export type AssistantFaq = { question: string; answer: string };

export function createAssistantConversationTitle(question: string): string {
  const normalised = question.replace(/\s+/g, " ").trim();
  if (normalised.length <= 72) return normalised || "Golf Trip question";
  return `${normalised.slice(0, 69).trimEnd()}…`;
}

export function formatTripFaqContext(faqs: AssistantFaq[]): string {
  if (faqs.length === 0) return "";
  return `\n\nTrip FAQs supplied by the administrator (treat these as trip-specific guidance):\n${faqs
    .map((faq, index) => `${index + 1}. Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n")}`;
}
