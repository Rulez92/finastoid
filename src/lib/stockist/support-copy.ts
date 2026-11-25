// Single source of truth for all visible stockist Support text.
// Save as: lib/stockist/support-copy.ts

export const SUPPORT_TEXT = {
  page: {
    titleLead: "Your",
    titleAccent: "Support",
    subtitle:
      "Questions about bulk orders, payments, stock or your affiliates? Message the Finasto™ team directly.",
    whatsapp: "Chat with us on WhatsApp",
    whatsappOff: "WhatsApp chat is unavailable right now",
  },
  composer: {
    title: "Send us a message",
    subtitle: "We will reply to your login email.",
  },
  details: {
    title: "Your details",
    name: "Name",
    country: "Country",
    email: "Reply email",
    none: "Not available",
  },
  response: {
    title: "Response time",
    body: "We usually reply within 1 business day. WhatsApp is the fastest way for urgent questions.",
  },
  tips: {
    title: "Get help faster",
    items: [
      "Include the order number or payment reference.",
      "Describe what you expected and what happened.",
      "Mention the date, product and quantity, if it is about stock.",
    ],
  },
  form: {
    topics: "Quick topic",
    subject: "Subject",
    subjectPlaceholder: "e.g. Question about a bulk order",
    message: "Message",
    messagePlaceholder: "Describe what you need help with",
    send: "Send message",
    sending: "Sending...",
    repliesGoTo: "Replies go to",
    sent: "Message sent. We will reply to",
    shortcut: "Ctrl + Enter to send",
  },
  topicChips: [
    { key: "orders", label: "Bulk orders", subject: "Question about a bulk order" },
    { key: "payments", label: "Payments", subject: "Payment question" },
    { key: "stock", label: "Stock", subject: "Stock or inventory question" },
    { key: "affiliates", label: "Affiliates", subject: "Question about my affiliates" },
    { key: "other", label: "Other", subject: "" },
  ],
} as const;

export function whatsappGreeting(name?: string | null, email?: string | null) {
  return name && email
    ? `Hello Finasto, I'm ${name} (stockist, ${email}). I need help with: `
    : "Hello Finasto, I'm a stockist. I need help with: ";
}