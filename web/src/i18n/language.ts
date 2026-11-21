import { useSyncExternalStore } from 'react';

/** en: English only. ml: Malayalam only, English where a translation is missing. both: the two side by side. */
export type Lang = 'en' | 'ml' | 'both';

export const LANGS: readonly Lang[] = ['en', 'ml', 'both'];

const KEY = 'kayal.lang';
const listeners = new Set<() => void>();

function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'ml' || v === 'both';
}

function read(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

let stored: Lang | null = typeof window === 'undefined' ? null : read();

function applyHtmlLang(lang: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'ml' ? 'ml' : 'en';
}
applyHtmlLang(stored ?? 'en');

function emit() {
  for (const fn of listeners) fn();
}

if (typeof window !== 'undefined') {
  // Another tab changed the setting.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    stored = read();
    applyHtmlLang(stored ?? 'en');
    emit();
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setLang(lang: Lang) {
  stored = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  applyHtmlLang(lang);
  emit();
}

/** The language setting. English until the visitor picks one. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => stored ?? 'en', () => 'en');
}

/** False until the visitor has picked a language on this device. */
export function useLangChosen(): boolean {
  return useSyncExternalStore(subscribe, () => stored !== null, () => true);
}

/** One string for a spot that holds one language, such as a button label or an aria-label. */
export function pick(text: { en: string; ml: string }, lang: Lang): string {
  return lang === 'ml' && text.ml ? text.ml : text.en;
}

/** `pick` bound to the current setting, for components with several single-language spots. */
export function usePick() {
  const lang = useLang();
  return (text: { en: string; ml: string }) => pick(text, lang);
}

/** The language code for the speech reply the server sends back. */
export function replyLanguage(lang: Lang): 'en-IN' | 'ml-IN' {
  return lang === 'en' ? 'en-IN' : 'ml-IN';
}
