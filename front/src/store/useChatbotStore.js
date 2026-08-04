import { create } from "zustand";
import i18n from "../i18n";
import { http } from "../services/apiService";

let nextId = 1;

export const useChatbotStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  isSending: false,

  toggle() {
    set((s) => ({ isOpen: !s.isOpen }));
  },

  close() {
    set({ isOpen: false });
  },

  async sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Captured before the new user turn is appended below, so it's exactly the prior
    // conversation — resolves translation keys (the seeded greeting) to real text since the
    // backend has no access to i18n. Sent on every request so the model can resolve short
    // follow-ups ("30") against venue/date/time slots mentioned earlier in the chat.
    const history = get().messages.map((m) => ({ role: m.role, text: m.isKey ? i18n.t(m.text) : m.text }));

    set((s) => ({
      messages: [...s.messages, { id: nextId++, role: "user", text: trimmed }],
      isSending: true,
    }));

    try {
      // The backend detects language from the message itself, but also uses this as a
      // tiebreaker for short/ambiguous messages ("hi", "ok") and to pick which language its
      // canned fallback reply is in if OpenRouter itself is unreachable.
      const { data } = await http.post("/chatbot/message", { message: trimmed, language: i18n.language, history });
      set((s) => ({
        messages: [...s.messages, { id: nextId++, role: "bot", text: data.reply }],
        isSending: false,
      }));
    } catch {
      // A down/unreachable chatbot endpoint degrades into an inline bot message instead of a
      // silently stuck "typing" state — matches how the rest of the app surfaces API failures.
      // `isKey` tells the widget to run this one through t() at render time.
      set((s) => ({
        messages: [...s.messages, { id: nextId++, role: "bot", text: "chatbot.error", isKey: true }],
        isSending: false,
      }));
    }
  },
}));

// Exposed for the widget to seed a greeting the first time it's opened, without importing
// react-i18next into the store itself.
export function seedGreeting(text) {
  const { messages } = useChatbotStore.getState();
  if (messages.length === 0) {
    useChatbotStore.setState({ messages: [{ id: nextId++, role: "bot", text }] });
  }
}
