// What the crew spoke, from the locale the server sends (`heard.language`, `reply.language`).

/** English names for the languages Sarvam hears and speaks, keyed by the locale's first part. */
const NAMES: Record<string, string> = {
  bn: 'Bengali',
  en: 'English',
  gu: 'Gujarati',
  hi: 'Hindi',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  od: 'Odia',
  or: 'Odia',
  pa: 'Punjabi',
  ta: 'Tamil',
  te: 'Telugu',
};

export interface Spoken {
  /** The value for a `lang` attribute. Sarvam writes Odia as `od-IN`; BCP-47 says `or`. */
  lang: string | undefined;
  /** English name, such as "Tamil". Null when the locale is unknown. */
  name: string | null;
  /** The language's name in its own script, such as "தமிழ்", from the browser's locale data. */
  native: string | null;
  isEnglish: boolean;
}

function displayName(code: string, inLocale: string): string | null {
  try {
    const name = new Intl.DisplayNames([inLocale], { type: 'language', fallback: 'none' }).of(code);
    return name && name.toLowerCase() !== code ? name : null;
  } catch {
    return null;
  }
}

export function spokenLanguage(locale: string | null | undefined): Spoken {
  const base = (locale ?? '').split('-')[0]!.toLowerCase();
  if (!/^[a-z]{2,3}$/.test(base)) return { lang: undefined, name: null, native: null, isEnglish: false };
  const lang = base === 'od' ? 'or' : base;
  const isEnglish = lang === 'en';
  const name = NAMES[base] ?? displayName(lang, 'en');
  const native = isEnglish ? null : displayName(lang, lang);
  return { lang, name, native: native && native !== name ? native : null, isEnglish };
}

/** Each language's own name, for the intro line that invites crew to speak their language. */
export function nativeNames(codes: readonly string[]): { lang: string; text: string }[] {
  return codes.flatMap((lang) => {
    const text = displayName(lang, lang);
    // A browser without that locale's data answers in English; that name helps nobody here.
    return text && text !== displayName(lang, 'en') ? [{ lang, text }] : [];
  });
}
