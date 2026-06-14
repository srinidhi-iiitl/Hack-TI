import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/languageContext.js';
import { restorePageToEnglish, scanAndTranslate } from '../services/translationService.js';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function usePageTranslation() {
  const { language } = useLanguage();
  const location = useLocation();
  const observerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const runTranslation = async () => {
      if (cancelled) return;

      if (language === 'en') {
        restorePageToEnglish(document.body);
        return;
      }

      await scanAndTranslate(document.body, language);
    };

    const timer = setTimeout(runTranslation, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [language, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (language === 'en') {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return undefined;
    }

    const debouncedScan = debounce(() => {
      scanAndTranslate(document.body, language);
    }, 600);

    observerRef.current = new MutationObserver((mutations) => {
      const hasMeaningfulChange = mutations.some((mutation) => {
        if (mutation.type === 'characterData') return true;
        if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
          return true;
        }
        return false;
      });

      if (hasMeaningfulChange) {
        debouncedScan();
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [language]);
}
