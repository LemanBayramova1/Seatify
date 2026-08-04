import { ELEMENT_TYPES, TABLE_ELEMENT_TYPES } from "./zones";

const SUPPORTED_LANGS = new Set(["az", "tr", "ru", "en"]);

function normalizeLang(lang) {
  const code = (lang ?? "").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.has(code) ? code : "az";
}

// Purely-decorative elements always display their canonical, per-language name — the label
// an owner types for these (if any) is cosmetic in the editor's properties panel only.
const DECOR_LABELS = {
  [ELEMENT_TYPES.DOOR]: { az: "Qapı", tr: "Kapı", ru: "Дверь", en: "Door" },
  [ELEMENT_TYPES.WINDOW]: { az: "Pəncərə", tr: "Pencere", ru: "Окно", en: "Window" },
  [ELEMENT_TYPES.WALL]: { az: "Arakəsmə / Divar", tr: "Duvar", ru: "Стена", en: "Wall" },
  [ELEMENT_TYPES.STAGE]: { az: "Səhnə", tr: "Sahne", ru: "Сцена", en: "Stage" },
  [ELEMENT_TYPES.BAR_KITCHEN]: { az: "Bar / Mətbəx", tr: "Bar / Mutfak", ru: "Бар", en: "Bar" },
};

const TABLE_WORD = { az: "Masa", tr: "Masa", ru: "Стол", en: "Table" };
const CAPACITY_UNIT = { az: "nəfərlik", tr: "kişilik", ru: "мес.", en: "seats" };

// Placeholder text `defaultsForType` (useEditorStore.js) assigns a brand-new table before an
// owner renames it — only these get replaced by the localized "Masa - 4 nəfərlik" pattern.
// Anything else is a name the owner explicitly typed and is shown verbatim in every language.
const DEFAULT_TABLE_LABELS = new Set(["new table", "masa", "table", "стол"]);

/** Resolves the display text for a floor-plan canvas element (table or decoration) in the
 * given language — re-run on every render so switching AZ/TR/RU/EN relabels the canvas
 * instantly without needing a page refresh. */
export function getLocalizedElementLabel(element, lang) {
  const code = normalizeLang(lang);

  if (!TABLE_ELEMENT_TYPES.includes(element.type)) {
    return DECOR_LABELS[element.type]?.[code] ?? element.label ?? "";
  }

  const isDefaultLabel = !element.label || DEFAULT_TABLE_LABELS.has(element.label.trim().toLowerCase());
  if (!isDefaultLabel) {
    return element.label;
  }

  return element.capacity ? `${TABLE_WORD[code]} - ${element.capacity} ${CAPACITY_UNIT[code]}` : TABLE_WORD[code];
}
