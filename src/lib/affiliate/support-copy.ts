// Single source of truth for all visible Support text.
// To add a language later, turn this object into a per-locale
// dictionary. No markup needs to change.

export const SUPPORT_TEXT = {
  page: {
    titleLead: "Your",
    titleAccent: "Support",
    subtitle:
      "Have questions about orders, payouts or your account? Contact the FINASTO™ team directly.",
    whatsapp: "Chat with us on WhatsApp",
    whatsappOff: "WhatsApp chat is unavailable right now",
  },
  composer: {
    title: "Send us a message",
    subtitle: "We will respond to your registered email address.",
  },
  details: {
    title: "Your details",
    name: "Name",
    code: "Affiliate code",
    email: "Registered Email",
    none: "Not available",
  },
  response: {
    title: "Response time",
    body: "Our team typically responds within one business day. For urgent enquiries, contact us via WhatsApp for faster assistance.",
  },
  tips: {
    title: "Get help faster",
    items: [
      "Include the order number or payout reference.",
      "Describe what you expected and what happened.",
      "Mention the date and amount, if it is about money.",
    ],
  },
  form: {
    topics: "Quick topic",
    subject: "Subject",
    subjectPlaceholder: "e.g. Question about a payout",
    message: "Message",
    messagePlaceholder: "Describe what you need help with",
    send: "Send message",
    sending: "Sending...",
    repliesGoTo: "Replies go to",
    sent: "Message sent. We will reply to",
    shortcut: "Ctrl + Enter to send",
  },
  topicChips: [
    { key: "orders", label: "Orders", subject: "Question about an order" },
    { key: "payouts", label: "Payouts", subject: "Payout request question" },
    { key: "account", label: "Account", subject: "Account or settings help" },
    { key: "other", label: "Other", subject: "" },
  ],
} as const;

export function whatsappGreeting(name?: string | null, code?: string | null) {
  return name && code
    ? `Hello Finasto, I'm ${name} (affiliate code ${code}). I need help with: `
    : "Hello Finasto, I need help with: ";
}