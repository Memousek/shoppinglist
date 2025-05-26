/**
 * AuthModal komponenta pro přihlášení, registraci a reset hesla.
 * Moderní UX, přístupnost, tmavý režim.
 */
'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/supabaseClient';

export type AuthModalMode = 'login' | 'register' | 'reset';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const initialState = { email: '', password: '', error: '', loading: false, info: '' };

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthModalMode>('login');
  const [state, setState] = useState(initialState);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, [e.target.name]: e.target.value, error: '', info: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ ...state, error: '', info: '', loading: true });
    if (!state.email) {
      setState({ ...state, error: 'Vyplňte email.', loading: false });
      return;
    }
    if (mode !== 'reset' && !state.password) {
      setState({ ...state, error: 'Vyplňte heslo.', loading: false });
      return;
    }
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: state.email, password: state.password });
      if (error) setState({ ...state, error: error.message, loading: false });
      else {
        setState(initialState);
        onClose();
      }
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email: state.email, password: state.password });
      if (error) setState({ ...state, error: error.message, loading: false });
      else setState({ ...initialState, info: 'Registrace úspěšná! Zkontrolujte email pro potvrzení.' });
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(state.email);
      if (error) setState({ ...state, error: error.message, loading: false });
      else setState({ ...initialState, info: 'Na email byl odeslán odkaz pro změnu hesla.' });
    }
    setState({ ...state, loading: false });
  };

  const handleSwitch = (newMode: AuthModalMode) => {
    setMode(newMode);
    setState(initialState);
    setTimeout(() => emailInputRef.current?.focus(), 100);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50" role="dialog" aria-modal="true">
      <form
        className="bg-zinc-900 rounded shadow-lg p-6 w-full max-w-xs flex flex-col gap-3 border border-zinc-700"
        onSubmit={handleSubmit}
        aria-label={mode === 'login' ? 'Přihlášení' : mode === 'register' ? 'Registrace' : 'Obnova hesla'}
      >
        <h2 className="text-lg font-semibold mb-2 text-white text-center">
          {mode === 'login' && 'Přihlášení'}
          {mode === 'register' && 'Registrace'}
          {mode === 'reset' && 'Obnova hesla'}
        </h2>
        <label htmlFor="email" className="text-sm text-zinc-200">Email</label>
        <input
          id="email"
          name="email"
          ref={emailInputRef}
          type="email"
          className="border rounded px-2 py-1 bg-zinc-800 text-white"
          value={state.email}
          onChange={handleChange}
          required
          autoComplete="email"
          aria-required="true"
          aria-label="Email"
        />
        {mode !== 'reset' && <>
          <label htmlFor="password" className="text-sm text-zinc-200">Heslo</label>
          <input
            id="password"
            name="password"
            type="password"
            className="border rounded px-2 py-1 bg-zinc-800 text-white"
            value={state.password}
            onChange={handleChange}
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            aria-required="true"
            aria-label="Heslo"
          />
        </>}
        {state.error && <div className="text-red-500 text-xs" role="alert">{state.error}</div>}
        {state.info && <div className="text-green-500 text-xs" role="status">{state.info}</div>}
        <div className="flex flex-col gap-2 mt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-60"
            aria-label={mode === 'login' ? 'Přihlásit se' : mode === 'register' ? 'Registrovat se' : 'Obnovit heslo'}
            disabled={state.loading}
          >
            {mode === 'login' && 'Přihlásit se'}
            {mode === 'register' && 'Registrovat se'}
            {mode === 'reset' && 'Obnovit heslo'}
          </button>
          <button
            type="button"
            className="text-zinc-400 px-4 py-1 rounded hover:underline"
            onClick={onClose}
            aria-label="Zavřít"
          >
            Zavřít
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-2 text-xs text-center">
          {mode !== 'login' && (
            <button type="button" className="text-blue-400 hover:underline" onClick={() => handleSwitch('login')}>
              Máte účet? Přihlásit se
            </button>
          )}
          {mode !== 'register' && (
            <button type="button" className="text-blue-400 hover:underline" onClick={() => handleSwitch('register')}>
              Nemáte účet? Registrovat se
            </button>
          )}
          {mode !== 'reset' && (
            <button type="button" className="text-blue-400 hover:underline" onClick={() => handleSwitch('reset')}>
              Zapomněli jste heslo?
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 