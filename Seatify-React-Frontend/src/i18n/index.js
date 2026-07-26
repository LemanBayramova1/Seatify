import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import az from "./locales/az.json";

const STORAGE_KEY = "seatify.lang";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    az: { translation: az },
  },
  lng: localStorage.getItem(STORAGE_KEY) ?? "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export default i18n;
