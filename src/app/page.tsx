/**
 * Úvodní stránka aplikace Shopping List.
 * Umožňuje přihlášení přes Google nebo email pomocí Supabase Auth.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import AuthModal from './components/authModal';
import { t } from './i18n';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  if (loading) return <main className="flex items-center justify-center min-h-screen">{t('home.loading')}</main>;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4" aria-label={t('home.title')}>
      <h1 className="text-3xl font-bold">{t('home.title')}</h1>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSignInWithGoogle}
        aria-label={t('home.loginGoogle')}
        disabled={true}
      >
        {t('home.loginGoogle')}
      </button>
      <button
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        onClick={() => setShowAuthModal(true)}
        aria-label={t('home.loginEmail')}
      >
        {t('home.loginEmail')}
      </button>
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}
