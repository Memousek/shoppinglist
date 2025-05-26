import cs from '../locales/cs.json';
import en from '../locales/en.json';

const locales = { cs, en };

export function t(key: string): string {
  let lang = 'cs';
  if (typeof window !== 'undefined') {
    lang = localStorage.getItem('lang') || 'cs';
  }
  return (locales[lang as 'cs' | 'en'] as any)?.[key] || key;
} 