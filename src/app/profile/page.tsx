/**
 * Stránka Nastavení účtu (profil).
 * Umožňuje změnit heslo, zobrazit email a smazat účet.
 * Moderní UX, validace, přístupnost, tmavý režim.
 */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { useRouter } from 'next/navigation';
import Spinner from '../components/spinner';
import { showSuccess, showError, showInfo } from '../components/toast';

export default function ProfilePage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setEmail(data.session.user.email ?? '');
      else router.push('/');
    };
    getSession();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!newPassword || newPassword.length < 6) {
      showError('Heslo musí mít alespoň 6 znaků.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Hesla se neshodují.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) showError(error.message);
    else {
      showSuccess('Heslo bylo úspěšně změněno.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    setError(''); setInfo('');
    setLoading(true);
    // Supabase nemá client API pro smazání účtu, pouze přes admin API nebo edge function.
    // Zde pouze odhlásíme a zobrazíme info.
    await supabase.auth.signOut();
    setLoading(false);
    showInfo('Účet byl odhlášen. Pro smazání účtu kontaktujte podporu.');
    setTimeout(() => router.push('/'), 2000);
  };

  return (
    <main className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Nastavení účtu</h1>
      <div className="mb-6 p-4 bg-zinc-900 rounded border border-zinc-700">
        <div className="text-sm text-zinc-400 mb-1">Přihlášený email:</div>
        <div className="font-mono text-blue-300 text-lg">{email}</div>
      </div>
      <form onSubmit={handleChangePassword} className="bg-zinc-900 rounded border border-zinc-700 p-4 flex flex-col gap-3 mb-8" aria-label="Změna hesla">
        <h2 className="text-lg font-semibold text-white mb-2">Změna hesla</h2>
        <label htmlFor="newPassword" className="text-sm text-zinc-200">Nové heslo</label>
        <input
          id="newPassword"
          type="password"
          className="border rounded px-2 py-1 bg-zinc-800 text-white"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          minLength={6}
          required
          autoComplete="new-password"
        />
        <label htmlFor="confirmPassword" className="text-sm text-zinc-200">Potvrzení hesla</label>
        <input
          id="confirmPassword"
          type="password"
          className="border rounded px-2 py-1 bg-zinc-800 text-white"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          minLength={6}
          required
          autoComplete="new-password"
        />
        {error && <div className="text-red-500 text-xs" role="alert">{error}</div>}
        {info && <div className="text-green-500 text-xs" role="status">{info}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-60 mt-2"
          disabled={loading}
        >
          {loading ? <Spinner size={18} /> : 'Změnit heslo'}
        </button>
      </form>
      <div className="bg-zinc-900 rounded border border-zinc-700 p-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-white mb-2">Smazat účet</h2>
        <p className="text-sm text-zinc-400 mb-2">Tato akce je nevratná.</p>
        {deleteConfirm ? (
          <button
            className="bg-red-700 text-white px-4 py-1 rounded hover:bg-red-800 disabled:opacity-60"
            onClick={handleDeleteAccount}
            disabled={loading}
          >
            {loading ? <Spinner size={18} /> : 'Opravdu smazat účet'}
          </button>
        ) : (
          <button
            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
            onClick={() => setDeleteConfirm(true)}
          >
            Smazat účet
          </button>
        )}
      </div>
    </main>
  );
} 