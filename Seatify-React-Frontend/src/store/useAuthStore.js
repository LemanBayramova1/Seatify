import { create } from "zustand";
import { http } from "../services/apiService";

const STORAGE_KEY = "seatify.auth.user";
const TOKEN_KEY = "seatify.token";
const MOCK_ROLES_KEY = "seatify.mock.userRoles.v1";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_NAME = "Əli Məmmədov";

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export const ROLES = {
  CUSTOMER: "Customer",
  RESTAURANT_OWNER: "RestaurantOwner",
};

// Mirrors AuthService.TryNormalizeRole on the C# side — accepts loose variants
// ("Restaurant Owner", "Owner", "restaurant_owner", ...) so any UI copy or manual
// API call still lands on the canonical role string the rest of the app compares against.
function normalizeRole(role) {
  const key = (role ?? "").replace(/[^a-z]/gi, "").toLowerCase();
  if (key === "owner" || key === "restaurant" || key === "restaurantowner") return ROLES.RESTAURANT_OWNER;
  return ROLES.CUSTOMER;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(user, token) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

// ---------------------------------------------------------------------------
// Mock-mode role directory — a real backend remembers each account's role;
// the localStorage mock has no database, so we keep a tiny email->role map
// alongside it purely so a later mock login reflects what was picked at
// mock register time instead of always defaulting to Customer.
// ---------------------------------------------------------------------------
function loadMockRoles() {
  try {
    const raw = localStorage.getItem(MOCK_ROLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function rememberMockRole(email, role) {
  const roles = loadMockRoles();
  roles[email.trim().toLowerCase()] = role;
  localStorage.setItem(MOCK_ROLES_KEY, JSON.stringify(roles));
}

function lookupMockRole(email) {
  return loadMockRoles()[email.trim().toLowerCase()] ?? ROLES.CUSTOMER;
}

export const useAuthStore = create((set) => ({
  user: loadUser(),
  isSubmitting: false,
  isModalOpen: false,
  modalMode: "login",
  modalPresetRole: null,

  /** `presetRole` pre-selects a role on the register tab — e.g. the landing page's
   * "Restoran Sahibisiniz?" CTA opens straight into the Restaurant Owner registration form. */
  openAuthModal(mode = "login", presetRole = null) {
    set({ isModalOpen: true, modalMode: mode, modalPresetRole: presetRole });
  },

  closeAuthModal() {
    set({ isModalOpen: false });
  },

  setModalMode(mode) {
    set({ modalMode: mode });
  },

  async login(email, password) {
    if (!EMAIL_PATTERN.test(email.trim())) throw new Error("auth.errors.invalidEmail");
    if (!password || password.length < 4) throw new Error("auth.errors.shortPassword");
    set({ isSubmitting: true });

    if (USE_MOCKS) {
      await wait(400 + Math.random() * 300);
      const role = lookupMockRole(email);
      const user = { name: DEMO_NAME, email: email.trim(), role, initials: initials(DEMO_NAME) };
      persistUser(user);
      set({ user, isSubmitting: false });
      return user;
    }

    try {
      const { data } = await http.post("/auth/login", { email: email.trim(), password });
      const user = { ...data.user, initials: initials(data.user.name) };
      persistUser(user, data.token);
      set({ user, isSubmitting: false });
      return user;
    } catch (err) {
      set({ isSubmitting: false });
      throw new Error(err.response?.data?.error ?? "auth.errors.loginFailed");
    }
  },

  /**
   * `role` accepts any of ROLES' values, plus loose variants normalized via normalizeRole.
   * `extra` carries fields the AuthModal collects beyond the base four: `phone` (both roles),
   * and for RestaurantOwner registrations `restaurantName`/`restaurantAddress`/`city`/
   * `businessEmail`/`businessPhone`.
   */
  async register(name, email, password, role = ROLES.CUSTOMER, extra = {}) {
    if (!name.trim()) throw new Error("auth.errors.nameRequired");
    if (!EMAIL_PATTERN.test(email.trim())) throw new Error("auth.errors.invalidEmail");
    if (!password || password.length < 4) throw new Error("auth.errors.shortPassword");
    const normalizedRole = normalizeRole(role);
    set({ isSubmitting: true });

    if (USE_MOCKS) {
      await wait(400 + Math.random() * 300);
      rememberMockRole(email, normalizedRole);
      const user = {
        name: name.trim(),
        email: email.trim(),
        role: normalizedRole,
        initials: initials(name.trim()),
        phone: extra.phone ?? null,
        ...(normalizedRole === ROLES.RESTAURANT_OWNER
          ? {
              restaurantName: extra.restaurantName,
              restaurantAddress: extra.restaurantAddress,
              city: extra.city,
              businessEmail: extra.businessEmail,
              businessPhone: extra.businessPhone,
            }
          : {}),
      };
      persistUser(user);
      set({ user, isSubmitting: false });
      return user;
    }

    try {
      const { data } = await http.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        role: normalizedRole,
        phone: extra.phone || undefined,
        restaurantName: extra.restaurantName || undefined,
        restaurantAddress: extra.restaurantAddress || undefined,
        city: extra.city || undefined,
        businessEmail: extra.businessEmail || undefined,
        businessPhone: extra.businessPhone || undefined,
      });
      const user = { ...data.user, initials: initials(data.user.name) };
      persistUser(user, data.token);
      set({ user, isSubmitting: false });
      return user;
    } catch (err) {
      set({ isSubmitting: false });
      throw new Error(err.response?.data?.error ?? "auth.errors.registerFailed");
    }
  },

  logout() {
    persistUser(null);
    set({ user: null });
  },
}));
