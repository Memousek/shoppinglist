/**
 * LanguageAutoTranslate komponenta pro automatický překlad stránky pomocí LibreTranslate.
 * Překládá všechny textové nody v <main>, <nav> a modalech, včetně aria-label/title.
 * Všechny texty překládá v jednom batch requestu pro rychlost.
 */
'use client';

import { useEffect, useState } from 'react';

function isVisible(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  const style = window.getComputedStyle(node as Element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

export default function LanguageAutoTranslate() {
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function translateAllTextNodes(lang: string) {
      if (lang === 'cs') return;
      setTranslating(true);
      const roots: Element[] = [];
      const main = document.querySelector('main');
      if (main) roots.push(main);
      const nav = document.querySelector('nav');
      if (nav) roots.push(nav);
      document.querySelectorAll('.modal, [role=dialog]').forEach(el => roots.push(el));
      // 1. Sesbírej všechny textové nody a unikátní texty
      const textNodes: Text[] = [];
      const textValues: string[] = [];
      const textMap = new Map<string, Text[]>();
      for (const root of roots) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: node => {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            if (!isVisible(node.parentElement || node)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let n;
        while ((n = walker.nextNode())) {
          const val = n.nodeValue!;
          textNodes.push(n as Text);
          if (!textMap.has(val)) {
            textValues.push(val);
            textMap.set(val, [n as Text]);
          } else {
            textMap.get(val)!.push(n as Text);
          }
        }
      }
      // 2. Překlad batchově (pouze texty, které nejsou v cache)
      const textsToTranslate: string[] = [];
      const indexesToTranslate: number[] = [];
      const translations: (string|null)[] = [];
      for (let i = 0; i < textValues.length; i++) {
        const val = textValues[i];
        const cacheKey = `tr_${lang}_${btoa(unescape(encodeURIComponent(val)))}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          translations[i] = cached;
        } else {
          translations[i] = null;
          textsToTranslate.push(val);
          indexesToTranslate.push(i);
        }
      }
      if (textsToTranslate.length > 0) {
        try {
          const res = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: textsToTranslate, source: 'cs', target: lang, format: 'text' })
          });
          const data = await res.json();
          if (Array.isArray(data) && data.length === textsToTranslate.length) {
            for (let j = 0; j < data.length; j++) {
              const translated = data[j].translatedText;
              const idx = indexesToTranslate[j];
              translations[idx] = translated;
              const cacheKey = `tr_${lang}_${btoa(unescape(encodeURIComponent(textValues[idx])))}`;
              if (translated) sessionStorage.setItem(cacheKey, translated);
            }
          } else if (data.translatedText) { // fallback pro 1 text
            const translated = data.translatedText;
            const idx = indexesToTranslate[0];
            translations[idx] = translated;
            const cacheKey = `tr_${lang}_${btoa(unescape(encodeURIComponent(textValues[idx])))}`;
            if (translated) sessionStorage.setItem(cacheKey, translated);
          }
        } catch (e) {
          console.warn('Batch překlad selhal:', e, textsToTranslate);
        }
      }
      // 3. Nastav překlady zpět do textových nodů
      for (let i = 0; i < textValues.length; i++) {
        const translated = translations[i];
        if (translated) {
          for (const node of textMap.get(textValues[i])!) {
            node.nodeValue = translated;
          }
        }
      }
      // 4. Překlad atributů aria-label, title (stále po jednom, většinou jich je málo)
      for (const root of roots) {
        const elWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let el;
        while ((el = elWalker.nextNode())) {
          const elem = el as HTMLElement;
          ['aria-label', 'title'].forEach(attr => {
            const val = elem.getAttribute(attr);
            if (val && val.trim()) {
              const cacheKey = `tr_${lang}_${btoa(unescape(encodeURIComponent(val)))}`;
              let translated = sessionStorage.getItem(cacheKey);
              if (!translated) {
                fetch('https://libretranslate.de/translate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ q: val, source: 'cs', target: lang, format: 'text' })
                })
                  .then(res => res.json())
                  .then(data => {
                    translated = data.translatedText;
                    if (typeof translated === 'string' && translated) {
                      sessionStorage.setItem(cacheKey, translated);
                      elem.setAttribute(attr, translated);
                    }
                  })
                  .catch(e => console.warn('Překlad atributu selhal:', e, val));
              } else {
                if (typeof translated === 'string' && translated) {
                  elem.setAttribute(attr, translated);
                }
              }
            }
          });
        }
      }
      setTranslating(false);
      if (!cancelled) {
        setTimeout(() => translateAllTextNodes(lang), 1000);
      }
      console.log(`Batch překlad dokončen: ${textValues.length} unikátních textů.`);
    }
    const lang = typeof window !== 'undefined' ? localStorage.getItem('lang') || 'cs' : 'cs';
    if (lang !== 'cs') translateAllTextNodes(lang);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lang') window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('storage', onStorage); cancelled = true; };
  }, []);

  return translating ? (
    <div className="fixed top-2 right-2 z-[9999] bg-blue-900 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in" role="status" aria-live="polite">
      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
      Překládám stránku…
    </div>
  ) : null;
} 