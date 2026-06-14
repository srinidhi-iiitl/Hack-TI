/**
 * Browser-compatible shim for the translate-google package API.
 * Uses the same public Google Translate endpoint pattern for client-side calls.
 */

async function fetchTranslation(text, from, to) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: from,
    tl: to,
    dt: 't',
  });
  params.append('q', text);

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Translation request failed (${response.status})`);
  }

  const payload = await response.json();
  const segments = Array.isArray(payload?.[0]) ? payload[0] : [];
  return segments.map((part) => part?.[0] || '').join('').trim();
}

export default async function translate(text, opts = {}) {
  const from = opts.from || 'auto';
  const to = opts.to || 'en';

  if (text == null || text === '') {
    return text;
  }

  if (Array.isArray(text)) {
    const results = await Promise.all(text.map((entry) => fetchTranslation(String(entry), from, to)));
    return results;
  }

  if (typeof text === 'object') {
    const entries = Object.entries(text);
    const values = entries.map(([, value]) => String(value));
    const translatedValues = await Promise.all(values.map((value) => fetchTranslation(value, from, to)));
    return Object.fromEntries(entries.map(([key], index) => [key, translatedValues[index]]));
  }

  return fetchTranslation(String(text), from, to);
}
