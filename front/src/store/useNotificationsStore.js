import { create } from "zustand";
import { getNotifications, markNotificationRead } from "../services/apiService";

export const useNotificationsStore = create((set) => ({
  notifications: [],
  isLoading: false,
  isOpen: false,

  toggleOpen() {
    set((s) => ({ isOpen: !s.isOpen }));
  },

  close() {
    set({ isOpen: false });
  },

  async fetch() {
    set({ isLoading: true });
    try {
      const notifications = await getNotifications();
      set({ notifications, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  /** Prepends a notification pushed live over SignalR, ignoring a duplicate id (e.g. a push
   * that arrives just before/after a poll already picked up the same row). */
  receive(notification) {
    set((s) =>
      s.notifications.some((n) => n.id === notification.id)
        ? s
        : { notifications: [notification, ...s.notifications] },
    );
  },

  async markRead(id) {
    // Optimistic — the bell shouldn't wait on a round-trip to feel responsive; a later
    // fetch() reconciles if the request actually failed.
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
    try {
      await markNotificationRead(id);
    } catch {
      // Ignore — see optimistic-update note above.
    }
  },

  reset() {
    set({ notifications: [], isOpen: false, isLoading: false });
  },
}));
