import { create } from "zustand";

let dismissTimer;

export const useToastStore = create((set) => ({
  toast: null,

  showToast(message) {
    clearTimeout(dismissTimer);
    set({ toast: message });
    dismissTimer = setTimeout(() => set({ toast: null }), 3000);
  },

  dismissToast() {
    clearTimeout(dismissTimer);
    set({ toast: null });
  },
}));
