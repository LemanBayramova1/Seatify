import { create } from "zustand";
import { cancelBooking, getMyBookings } from "../services/apiService";

export const useBookingsStore = create((set, get) => ({
  bookings: [],
  isLoading: false,
  hasLoaded: false,

  async load() {
    set({ isLoading: true });
    const bookings = await getMyBookings();
    set({ bookings, isLoading: false, hasLoaded: true });
  },

  addLocal(booking) {
    set((state) => ({ bookings: [booking, ...state.bookings] }));
  },

  async cancel(bookingId) {
    await cancelBooking({ bookingId });
    set({ bookings: get().bookings.filter((b) => b.id !== bookingId) });
  },
}));
