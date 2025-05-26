/**
 * i18n utilita – překlady podle jazyka z cookie 'lang' (SSR i client). Fallback na localStorage nebo cs.
 */
import cs from '../locales/cs.json';
import en from '../locales/en.json';

type TranslationKeys = keyof typeof cs;
type Locale = Record<TranslationKeys, string>;
const locales: Record<'cs' | 'en', Locale> = { cs, en };

function getLangFromCookie(): string {
  if (typeof document !== 'undefined') {
    // Client: cookie nebo localStorage
    const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
    if (match) return match[1];
    return localStorage.getItem('lang') || 'cs';
  } else if (typeof require !== 'undefined') {
    // Server: Next.js SSR (pokud budeš chtít, můžeš použít headers/cookies z requestu)
    // Zde fallback na cs
    return 'cs';
  }
  return 'cs';
}

export function t(key: TranslationKeys): string {
  const lang = getLangFromCookie();
  return locales[lang as 'cs' | 'en']?.[key] || key;
} 