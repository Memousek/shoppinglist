/**
 * Navbar komponenta pro Shopping List.
 * Zobrazuje název aplikace, odkaz na seznamy, profilové menu (email, změna hesla, odhlášení).
 * Responsivní, tmavý, přístupný.
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import { t } from '../i18n';

interface User {
  email: string;
  displayName?: string;
}

// Překladové jazyky
const LANGUAGES = [
  { code: 'cs', label: 'Čeština' },
  { code: 'en', label: 'English' },
];

function handleLanguageChange(lang: string) {
  localStorage.setItem('lang', lang);
  window.location.reload();
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setUser({
        email: data.session.user.email ?? '',
        displayName: data.session.user.user_metadata?.displayName || undefined
      });
      else setUser(null);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setUser({
        email: session.user.email ?? '',
        displayName: session.user.user_metadata?.displayName || undefined
      });
      else setUser(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Zavři menu při kliknutí mimo
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  if (!user) return null;

  return (
    <nav className="w-full bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          className="text-xl font-bold text-blue-400 hover:text-blue-300 focus:outline-none"
          onClick={() => router.push('/lists')}
          aria-label="Domů"
        >
          Shopping List
        </button>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          className="flex items-center gap-2 px-3 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 focus:outline focus:ring"
          onClick={() => setMenuOpen(o => !o)}
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-label={t('navbar.settings')}
        >
          <span className="font-mono text-xs truncate max-w-[120px]">
            {user.displayName ? user.displayName : user.email}
          </span>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M6 9l6 6 6-6"/></svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded shadow-lg py-2 z-50 animate-fade-in" role="menu">
            <div className="px-4 py-2 text-xs text-zinc-400">
              {user.displayName && <span className="font-semibold text-blue-300 mr-1">{user.displayName}</span>}
              <span>{user.email}</span>
            </div>
            <div className="px-4 py-2 border-b border-zinc-700">
              <label htmlFor="lang-switch" className="text-xs text-zinc-400 mr-1">{t('navbar.language')}</label>
              <select
                id="lang-switch"
                className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline focus:ring"
                value={typeof window !== 'undefined' ? localStorage.getItem('lang') || 'cs' : 'cs'}
                onChange={e => handleLanguageChange(e.target.value)}
                aria-label={t('navbar.language')}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <button
              className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-zinc-800 focus:outline focus:ring"
              onClick={() => { setMenuOpen(false); router.push('/profile'); }}
              role="menuitem"
            >
              {t('navbar.settings')}
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 focus:outline focus:ring"
              onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); router.push('/'); }}
              role="menuitem"
            >
              {t('navbar.logout')}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
} 