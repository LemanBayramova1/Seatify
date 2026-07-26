import { create } from "zustand";
import { getFloorPlans, resolveMyVenueId, saveLayout } from "../services/apiService";
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
    case ELEMENT_TYPES.WALL:
      return { ...base, type, width: 200, height: 12, label: "Wall" };
    case ELEMENT_TYPES.BAR_KITCHEN:
      return { ...base, type, width: 160, height: 100, label: "Bar" };
    default:
      return { ...base, type, width: 100, height: 100, label: type };
  }
}

function localFloorPlanId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Default to the builder canvas's native pixel size (see FloorPlanCanvas's STAGE_WIDTH/HEIGHT)
// so a brand-new zone renders at 1:1 scale — no stretch/shrink surprise for the common case.
function emptyFloorPlan(name, level) {
  return { id: localFloorPlanId(), name, level, canvasWidth: 860, canvasHeight: 560, backgroundImageUrl: null, elements: [] };
}

function mapActiveFloorPlan(floorPlans, activeFloorPlanId, mapFn) {
  return floorPlans.map((fp) => (fp.id === activeFloorPlanId ? mapFn(fp) : fp));
}

export const useEditorStore = create((set, get) => ({
  venueId: null,
  venueName: null,
  venueIsFallback: false,
  floorPlans: [],
  activeFloorPlanId: null,
  selectedId: null,
  history: [],
  isLoading: false,
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,
  loadError: null,

  /** Resolves which venue the signed-in Restaurant Owner manages (falling back to a seeded
   * demo venue if they don't have one yet), then loads its floor plans. Never leaves the page
   * stuck loading, even if the venue/floor-plan fetch fails — a real failure surfaces via
   * `loadError` instead of silently rendering an empty canvas. */
  async initialize() {
    set({ isLoading: true, loadError: null });
    try {
      const { venueId, venueName, isFallback } = await resolveMyVenueId();
      set({ venueId, venueName, venueIsFallback: isFallback });
      if (venueId) {
        await get().load();
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false, floorPlans: [], activeFloorPlanId: null, loadError: "builder.loadFailed" });
    }
  },

  async load() {
    set({ isLoading: true, loadError: null });
    try {
      const plans = await getFloorPlans(get().venueId);
      const floorPlans = plans?.length ? plans : [emptyFloorPlan("Əsas Zal", 0)];
      set({
        floorPlans,
        activeFloorPlanId: floorPlans[0].id,
        history: [],
        selectedId: null,
        isLoading: false,
        isDirty: false,
      });
    } catch {
      const fallback = [emptyFloorPlan("Əsas Zal", 0)];
      set({ floorPlans: fallback, activeFloorPlanId: fallback[0].id, isLoading: false, loadError: "builder.loadFailed" });
    }
  },

  pushHistory() {
    const { floorPlans, history } = get();
    const next = [...history, floorPlans].slice(-MAX_HISTORY);
    set({ history: next });
  },

  addFloorPlan(name) {
    get().pushHistory();
    set((state) => {
      const newPlan = emptyFloorPlan(name, state.floorPlans.length);
      return { floorPlans: [...state.floorPlans, newPlan], activeFloorPlanId: newPlan.id, selectedId: null, isDirty: true };
    });
  },

  renameFloorPlan(id, name) {
    set((state) => ({
      floorPlans: state.floorPlans.map((fp) => (fp.id === id ? { ...fp, name } : fp)),
      isDirty: true,
    }));
  },

  switchFloorPlan(id) {
    set({ activeFloorPlanId: id, selectedId: null });
  },

  /** No-op if `id` is the last remaining zone — a floor plan builder always needs at least one. */
  deleteFloorPlan(id) {
    const { floorPlans, activeFloorPlanId } = get();
    if (floorPlans.length <= 1) return;
    get().pushHistory();
    const remaining = floorPlans.filter((fp) => fp.id !== id);
    set({
      floorPlans: remaining,
      activeFloorPlanId: activeFloorPlanId === id ? remaining[0].id : activeFloorPlanId,
      selectedId: null,
      isDirty: true,
    });
  },

  addElement(type, position) {
    get().pushHistory();
    const el = { ...defaultsForType(type), ...(position ?? {}) };
    set((state) => ({
      floorPlans: mapActiveFloorPlan(state.floorPlans, state.activeFloorPlanId, (fp) => ({ ...fp, elements: [...fp.elements, el] })),
      selectedId: el.id,
      isDirty: true,
    }));
  },

  updateElement(id, patch, { silent } = {}) {
    if (!silent) get().pushHistory();
    set((state) => ({
      floorPlans: mapActiveFloorPlan(state.floorPlans, state.activeFloorPlanId, (fp) => ({
        ...fp,
        elements: fp.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      })),
      isDirty: true,
    }));
  },

  removeElement(id) {
    get().pushHistory();
    set((state) => ({
      floorPlans: mapActiveFloorPlan(state.floorPlans, state.activeFloorPlanId, (fp) => ({
        ...fp,
        elements: fp.elements.filter((el) => el.id !== id),
      })),
      selectedId: state.selectedId === id ? null : state.selectedId,
      isDirty: true,
    }));
  },

  selectElement(id) {
    set({ selectedId: id });
  },

  clearBoard() {
    get().pushHistory();
    set((state) => ({
      floorPlans: mapActiveFloorPlan(state.floorPlans, state.activeFloorPlanId, (fp) => ({ ...fp, elements: [] })),
      selectedId: null,
      isDirty: true,
    }));
  },

  undo() {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set((state) => ({
      floorPlans: previous,
      history: history.slice(0, -1),
      selectedId: null,
      isDirty: true,
      activeFloorPlanId: previous.some((fp) => fp.id === state.activeFloorPlanId) ? state.activeFloorPlanId : (previous[0]?.id ?? null),
    }));
  },

  async save() {
    set({ isSaving: true });
    try {
      const { venueId, floorPlans, activeFloorPlanId } = get();
      const activeLevel = floorPlans.find((fp) => fp.id === activeFloorPlanId)?.level;
      const saved = await saveLayout(venueId, floorPlans);
      const newActive = saved.find((fp) => fp.level === activeLevel) ?? saved[0];
      set({ floorPlans: saved, activeFloorPlanId: newActive?.id ?? null, isSaving: false, isDirty: false, lastSavedAt: Date.now() });
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },
}));
