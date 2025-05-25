/**
 * Úvodní stránka aplikace Shopping List.
 * Umožňuje přihlášení přes Google nebo email pomocí Supabase Auth.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setLoading(false);
      if (data.session) {
        router.push('/lists');
      }
    };
    getSession();
    // Listen for changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push('/lists');
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleSignInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleSignInWithEmail = async () => {
    const email = prompt('Zadejte svůj email:');
    if (email) {
      await supabase.auth.signInWithOtp({ email });
      alert('Zkontrolujte svůj email pro přihlášení.');
    }
  };

  if (loading) return <main className="flex items-center justify-center min-h-screen">Načítám...</main>;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">Shopping List</h1>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleSignInWithGoogle}
      >
        Přihlásit se přes Google
      </button>
      <button
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        onClick={handleSignInWithEmail}
      >
        Přihlásit se emailem
      </button>
    </main>
  );
}
