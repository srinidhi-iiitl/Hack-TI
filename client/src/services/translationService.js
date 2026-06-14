import translate from 'translate-google';

export const LANGUAGE_STORAGE_KEY = 'app_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

const CACHE_PREFIX = 'translation_';
const ORIGINAL_TEXT_ATTR = 'data-translation-original';
const ORIGINAL_PLACEHOLDER_ATTR = 'data-translation-original-placeholder';
const TRANSLATED_LANG_ATTR = 'data-translation-lang';

const TEXT_SELECTORS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'button', 'a', 'label', 'td', 'th', 'li'];
const PLACEHOLDER_SELECTORS = ['input[placeholder]', 'textarea[placeholder]'];
const IGNORE_ANCESTORS = 'svg, script, style, noscript, [data-no-translate]';

const SKIP_TEXT_PATTERNS = [
  /^\s*$/,
  /^[\d\s.,+\-/%°:₹$€£]+$/,
  /^\$?[\d,]+(\.\d+)?(k|m|b)?$/i,
  /^\d+(\.\d+)?%$/,
  /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
  /^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i,
  /^[\d,]+(\.\d+)?\s*(kcal|bpm|ms|km|xp|steps?)$/i,
  /^[\d]+(\+)?$/,
  /^[⌘⌥⇧]+[A-Z]?$/,
  /^[^\p{L}]+$/u,
];

let activeScanToken = 0;

function shouldTranslateText(text) {
  const trimmed = String(text || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  if (trimmed.length > 500) return false;
  return !SKIP_TEXT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function getCacheKey(language, text) {
  return `${CACHE_PREFIX}${language}_${text}`;
}

function readCachedTranslation(language, text) {
  try {
    return localStorage.getItem(getCacheKey(language, text));
  } catch {
    return null;
  }
}

function writeCachedTranslation(language, text, translated) {
  try {
    localStorage.setItem(getCacheKey(language, text), translated);
  } catch {
    // Ignore quota errors for demo usage.
  }
}

function isIgnoredElement(element) {
  return Boolean(element?.closest(IGNORE_ANCESTORS));
}

function getLeafTextElements(root) {
  const selector = TEXT_SELECTORS.join(',');
  const candidates = root.querySelectorAll(selector);
  return [...candidates].filter((element) => {
    if (isIgnoredElement(element)) return false;
    if (element.querySelector(selector)) return false;
    const text = getElementOriginalText(element);
    return shouldTranslateText(text);
  });
}

function getPlaceholderElements(root) {
  return [...root.querySelectorAll(PLACEHOLDER_SELECTORS.join(','))].filter((element) => {
    if (isIgnoredElement(element)) return false;
    return shouldTranslateText(getElementOriginalPlaceholder(element));
  });
}

function getElementOriginalText(element) {
  if (element.hasAttribute(ORIGINAL_TEXT_ATTR)) {
    return element.getAttribute(ORIGINAL_TEXT_ATTR).replace(/\s+/g, ' ').trim();
  }
  return element.textContent.replace(/\s+/g, ' ').trim();
}

function getElementOriginalPlaceholder(element) {
  if (element.hasAttribute(ORIGINAL_PLACEHOLDER_ATTR)) {
    return element.getAttribute(ORIGINAL_PLACEHOLDER_ATTR).trim();
  }
  return (element.getAttribute('placeholder') || '').trim();
}

function rememberOriginalText(element) {
  if (!element.hasAttribute(ORIGINAL_TEXT_ATTR)) {
    element.setAttribute(ORIGINAL_TEXT_ATTR, element.textContent || '');
  }
}

function rememberOriginalPlaceholder(element) {
  if (!element.hasAttribute(ORIGINAL_PLACEHOLDER_ATTR)) {
    element.setAttribute(ORIGINAL_PLACEHOLDER_ATTR, element.getAttribute('placeholder') || '');
  }
}

export function restorePageToEnglish(root = document.body) {
  if (!root) return;

  root.querySelectorAll(`[${ORIGINAL_TEXT_ATTR}]`).forEach((element) => {
    element.textContent = element.getAttribute(ORIGINAL_TEXT_ATTR) || '';
    element.removeAttribute(ORIGINAL_TEXT_ATTR);
    element.removeAttribute(TRANSLATED_LANG_ATTR);
  });

  root.querySelectorAll(`[${ORIGINAL_PLACEHOLDER_ATTR}]`).forEach((element) => {
    element.setAttribute('placeholder', element.getAttribute(ORIGINAL_PLACEHOLDER_ATTR) || '');
    element.removeAttribute(ORIGINAL_PLACEHOLDER_ATTR);
    element.removeAttribute(TRANSLATED_LANG_ATTR);
  });
}

async function translateUniqueStrings(strings, language) {
  const uniqueStrings = [...new Set(strings)];
  const resolved = new Map();
  const pending = [];

  uniqueStrings.forEach((text) => {
    const cached = readCachedTranslation(language, text);
    if (cached) {
      resolved.set(text, cached);
    } else {
      pending.push(text);
    }
  });

  const batchSize = 20;
  for (let index = 0; index < pending.length; index += batchSize) {
    const batch = pending.slice(index, index + batchSize);
    try {
      const translatedBatch = await translate(batch, { from: 'en', to: language });
      const normalized = Array.isArray(translatedBatch) ? translatedBatch : [translatedBatch];
      batch.forEach((text, batchIndex) => {
        const translated = normalized[batchIndex] || text;
        writeCachedTranslation(language, text, translated);
        resolved.set(text, translated);
      });
    } catch (error) {
      console.warn('[translationService] Batch translation failed:', error);
      batch.forEach((text) => resolved.set(text, text));
    }
  }

  return resolved;
}

function applyTranslations(entries, translations, language) {
  entries.forEach(({ element, original, kind }) => {
    const translated = translations.get(original) || original;
    if (kind === 'placeholder') {
      rememberOriginalPlaceholder(element);
      element.setAttribute('placeholder', translated);
    } else {
      rememberOriginalText(element);
      element.textContent = translated;
    }
    element.setAttribute(TRANSLATED_LANG_ATTR, language);
  });
}

export async function scanAndTranslate(root = document.body, language = 'en') {
  if (!root || language === 'en') {
    restorePageToEnglish(root);
    return;
  }

  const scanToken = ++activeScanToken;

  const textElements = getLeafTextElements(root);
  const placeholderElements = getPlaceholderElements(root);

  const entries = [
    ...textElements.map((element) => ({
      element,
      kind: 'text',
      original: getElementOriginalText(element),
    })),
    ...placeholderElements.map((element) => ({
      element,
      kind: 'placeholder',
      original: getElementOriginalPlaceholder(element),
    })),
  ];

  if (entries.length === 0) return;

  const translations = await translateUniqueStrings(entries.map((entry) => entry.original), language);
  if (scanToken !== activeScanToken) return;

  applyTranslations(entries, translations, language);
}

export function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.some((lang) => lang.code === stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

export function storeLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures in demo mode.
  }
}
