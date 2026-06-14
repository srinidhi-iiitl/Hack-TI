import { Globe } from 'lucide-react';
import { useLanguage } from '../context/languageContext.js';

function LanguageSelector({ compact = false }) {
  const { language, setLanguage, languages } = useLanguage();

  return (
    <div
      className={`flex items-center gap-2 ${compact ? '' : 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5'}`}
      data-no-translate
    >
      {!compact && (
        <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 sm:inline-flex">
          <Globe className="h-3.5 w-3.5" />
          Language
        </span>
      )}
      <label className="sr-only" htmlFor="language-selector">
        Language
      </label>
      <select
        id="language-selector"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className={`cursor-pointer rounded-lg border border-white/10 bg-[#130b1c]/90 text-sm font-semibold text-white outline-none transition hover:border-white/20 focus:border-[#10c7a1]/45 ${
          compact ? 'h-9 px-2.5' : 'h-8 px-2.5'
        }`}
        aria-label="Select language"
      >
        {languages.map((entry) => (
          <option key={entry.code} value={entry.code} className="bg-[#130b1c] text-white">
            {entry.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;
