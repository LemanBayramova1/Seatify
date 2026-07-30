import { create } from "zustand";
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

    set((s) => ({
      messages: [...s.messages, { id: nextId++, role: "user", text: trimmed }],
      isSending: true,
    }));

    try {
      const { data } = await http.post("/chatbot/message", { message: trimmed });
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
