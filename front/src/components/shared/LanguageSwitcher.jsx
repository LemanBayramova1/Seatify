import { useTranslation } from "react-i18next";
import { setLanguage, SUPPORTED_LANGUAGES } from "../../i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition ${
            i18n.language === lang ? "bg-brand-500 text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
