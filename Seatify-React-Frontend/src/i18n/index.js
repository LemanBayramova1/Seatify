import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import az from "./locales/az.json";
import tr from "./locales/tr.json";
import ru from "./locales/ru.json";

const STORAGE_KEY = "seatify.lang";

// AZ is the platform's default language — Seatify is an Azerbaijan-first product.
export const SUPPORTED_LANGUAGES = ["az", "tr", "ru", "en"];

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    az: { translation: az },
    tr: { translation: tr },
    ru: { translation: ru },
  },
  lng: localStorage.getItem(STORAGE_KEY) ?? "az",
  fallbackLng: "az",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export default i18n;
