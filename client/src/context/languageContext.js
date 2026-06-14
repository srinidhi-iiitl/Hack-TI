import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import {
  SUPPORTED_LANGUAGES,
  getStoredLanguage,
  restorePageToEnglish,
  storeLanguage,
} from '../services/translationService.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    const resolved = SUPPORTED_LANGUAGES.some((entry) => entry.code === nextLanguage)
      ? nextLanguage
      : 'en';

    restorePageToEnglish(document.body);

    storeLanguage(resolved);
    setLanguageState(resolved);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: SUPPORTED_LANGUAGES,
      isEnglish: language === 'en',
    }),
    [language, setLanguage],
  );

  return createElement(LanguageContext.Provider, { value }, children);
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
