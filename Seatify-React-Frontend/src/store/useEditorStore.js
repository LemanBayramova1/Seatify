import { create } from "zustand";
import { getFloorPlan, getMyVenues, saveFloorPlan } from "../services/apiService";
import { ELEMENT_TYPES } from "../lib/zones";

const MAX_HISTORY = 50;

function defaultsForType(type) {
  const base = { id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, x: 200, y: 200, rotation: 0 };
  switch (type) {
    case ELEMENT_TYPES.ROUND_TABLE:
      return { ...base, type, width: 90, height: 90, label: "New table", capacity: 2, minDeposit: 20, zone: "GENERAL" };
    case ELEMENT_TYPES.SQUARE_TABLE:
      return { ...base, type, width: 100, height: 100, label: "New table", capacity: 4, minDeposit: 30, zone: "GENERAL" };
    case ELEMENT_TYPES.RECT_TABLE:
      return { ...base, type, width: 160, height: 90, label: "New table", capacity: 6, minDeposit: 50, zone: "GENERAL" };
    case ELEMENT_TYPES.STAGE:
      return { ...base, type, width: 180, height: 90, label: "Stage" };
    case ELEMENT_TYPES.WINDOW:
      return { ...base, type, width: 140, height: 16, label: "Window" };
    case ELEMENT_TYPES.DOOR:
      return { ...base, type, width: 60, height: 16, label: "Door" };
    default:
      return { ...base, type, width: 100, height: 100, label: type };
  }
}

export const useEditorStore = create((set, get) => ({
  venueId: null,
  venueName: null,
  elements: [],
  selectedId: null,
  history: [],
  isLoading: false,
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,

  /** Resolves which venue the signed-in Restaurant Owner manages, then loads its floor plan. */
  async initialize() {
    set({ isLoading: true });
    const venues = await getMyVenues();
    const venue = venues[0];
    set({ venueId: venue?.id ?? null, venueName: venue?.name ?? null });
    if (venue) await get().load();
    else set({ isLoading: false });
  },

  async load() {
    set({ isLoading: true });
    const plan = await getFloorPlan(get().venueId);
    set({ elements: plan.elements, history: [], selectedId: null, isLoading: false, isDirty: false });
  },

  pushHistory() {
    const { elements, history } = get();
    const next = [...history, elements].slice(-MAX_HISTORY);
    set({ history: next });
  },

  addElement(type, position) {
    get().pushHistory();
    const el = { ...defaultsForType(type), ...(position ?? {}) };
    set((state) => ({ elements: [...state.elements, el], selectedId: el.id, isDirty: true }));
  },

  updateElement(id, patch, { silent } = {}) {
    if (!silent) get().pushHistory();
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      isDirty: true,
    }));
  },

  removeElement(id) {
    get().pushHistory();
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      isDirty: true,
    }));
  },

  selectElement(id) {
    set({ selectedId: id });
  },

  clearBoard() {
    get().pushHistory();
    set({ elements: [], selectedId: null, isDirty: true });
  },

  undo() {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({ elements: previous, history: history.slice(0, -1), selectedId: null, isDirty: true });
  },

  async save() {
    set({ isSaving: true });
    try {
      const saved = await saveFloorPlan(get().venueId, get().elements);
      set({ elements: saved.elements, isSaving: false, isDirty: false, lastSavedAt: Date.now() });
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },
}));
