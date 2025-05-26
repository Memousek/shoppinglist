/**
 * AuthModal komponenta pro přihlášení, registraci a reset hesla.
 * Moderní UX, přístupnost, tmavý režim.
 */
'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { t } from '../i18n';

export type AuthModalMode = 'login' | 'register' | 'reset';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const initialState = { email: '', password: '', displayName: '', error: '', loading: false, info: '' };

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

    // Validace emailu (jednoduchý regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!state.email || !emailRegex.test(state.email)) {
      setState({ ...state, error: t('auth.errorEmail'), loading: false });
      return;
    }
    // Validace hesla (min. 6 znaků)
    if (mode !== 'reset' && (!state.password || state.password.length < 6)) {
      setState({ ...state, error: t('auth.errorPassword'), loading: false });
      return;
    }
    // Validace jména při registraci
    if (mode === 'register' && !state.displayName.trim()) {
      setState({ ...state, error: t('auth.errorName'), loading: false });
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: state.email, password: state.password });
      if (error) {
        let errorMsg = error.message;
        if (error.status === 400) errorMsg = t('auth.errorLogin');
        setState({ ...state, error: errorMsg, loading: false });
      } else {
        setState(initialState);
        onClose();
      }
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email: state.email,
        password: state.password,
        options: {
          data: { displayName: state.displayName }
        }
      });
      if (error) {
        let errorMsg = error.message;
        if (error.status === 429) errorMsg = t('auth.errorRegister429');
        if (error.status === 422) errorMsg = t('auth.errorRegister422');
        setState({ ...state, error: errorMsg, loading: false });
      } else {
        setState({ ...initialState, info: t('auth.infoRegister') });
      }
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(state.email);
      if (error) {
        let errorMsg = error.message;
        if (error.status === 429) errorMsg = t('auth.errorReset429');
        setState({ ...state, error: errorMsg, loading: false });
      } else {
        setState({ ...initialState, info: t('auth.infoReset') });
      }
    }
    setState(s => ({ ...s, loading: false }));
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
        aria-label={mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.register') : t('auth.reset')}
      >
        <h2 className="text-lg font-semibold mb-2 text-white text-center">
          {mode === 'login' && t('auth.login')}
          {mode === 'register' && t('auth.register')}
          {mode === 'reset' && t('auth.reset')}
        </h2>
        <label htmlFor="email" className="text-sm text-zinc-200">{t('auth.email')}</label>
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
          aria-label={t('auth.email')}
        />
        {mode === 'register' && (
          <>
            <label htmlFor="displayName" className="text-sm text-zinc-200">{t('auth.name')}</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              className="border rounded px-2 py-1 bg-zinc-800 text-white"
              value={state.displayName}
              onChange={handleChange}
              required
              autoComplete="name"
              aria-required="true"
              aria-label={t('auth.name')}
            />
          </>
        )}
        {mode !== 'reset' && <>
          <label htmlFor="password" className="text-sm text-zinc-200">{t('auth.password')}</label>
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
            aria-label={t('auth.password')}
          />
        </>}
        {state.error && <div className="text-red-500 text-xs" role="alert">{state.error}</div>}
        {state.info && <div className="text-green-500 text-xs" role="status">{state.info}</div>}
        <div className="flex flex-col gap-2 mt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-60"
            aria-label={mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.register') : t('auth.reset')}
            disabled={state.loading}
          >
            {mode === 'login' && t('auth.login')}
            {mode === 'register' && t('auth.register')}
            {mode === 'reset' && t('auth.reset')}
          </button>
          <button
            type="button"
            className="text-zinc-400 px-4 py-1 rounded hover:underline"
            onClick={onClose}
            aria-label={t('auth.close')}
          >
            {t('auth.close')}
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-2 text-xs text-center">
          {mode !== 'login' && (
            <button type="button" className="text-blue-400 hover:underline" onClick={() => handleSwitch('login')}>
              {t('auth.switchToLogin')}
            </button>
          )}
          {mode !== 'register' && (
            <button type="button" className="text-blue-400 hover:underline" onClick={() => handleSwitch('register')}>
              {t('auth.switchToRegister')}
            </button>
          )}
          {mode !== 'reset' && (
            <button type="button" className="text-blue-400 hover:underline" onClick={() => handleSwitch('reset')}>
              {t('auth.switchToReset')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 