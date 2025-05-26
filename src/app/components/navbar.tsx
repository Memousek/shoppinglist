/**
 * Navbar komponenta pro Shopping List.
 * Zobrazuje název aplikace, odkaz na seznamy, profilové menu (email, změna hesla, odhlášení).
 * Responsivní, tmavý, přístupný.
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/supabaseClient';

interface User {
  email: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setUser({ email: data.session.user.email ?? '' });
      else setUser(null);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setUser({ email: session.user.email ?? '' });
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
          aria-label="Uživatelské menu"
        >
          <span className="font-mono text-xs truncate max-w-[120px]">{user.email}</span>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M6 9l6 6 6-6"/></svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded shadow-lg py-2 z-50 animate-fade-in" role="menu">
            <div className="px-4 py-2 text-xs text-zinc-400">{user.email}</div>
            <button
              className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-zinc-800 focus:outline focus:ring"
              onClick={() => { setMenuOpen(false); router.push('/profile'); }}
              role="menuitem"
            >
              Nastavení účtu
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 focus:outline focus:ring"
              onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); router.push('/'); }}
              role="menuitem"
            >
              Odhlásit se
            </button>
          </div>
        )}
      </div>
    </nav>
  );
} 