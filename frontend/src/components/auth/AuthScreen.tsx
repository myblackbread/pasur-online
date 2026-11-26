'use client';

import React, { useState } from 'react';
import { User, Mail, ArrowRight, RefreshCw, AlertCircle, Spade } from 'lucide-react';
import { authService } from '@/services/authService';

interface AuthScreenProps {
  onSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'initial' | 'email_login' | 'email_signup'>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetState = () => {
    setErrorMsg(null);
  };

  const handleGuestSignIn = async () => {
    resetState();
    setIsLoading(true);
    try {
      await authService.signInAnonymously();
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не удалось войти гостем');
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!email.trim() || !password) {
      setErrorMsg('Заполните все обязательные поля');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'email_login') {
        await authService.signInWithEmail(email, password);
      } else {
        await authService.signUpWithEmail(email, password, name);
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ошибка аутентификации');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full h-dvh bg-bg text-text flex flex-col justify-between p-6 overflow-y-auto select-none"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      {/* Шапка / Логотип */}
      <div className="flex flex-col items-center text-center mt-6">
        <div className="w-16 h-16 rounded-3xl bg-input border border-white/10 flex items-center justify-center text-accent mb-4 shadow-xl shadow-black/50 brass-glow">
          <Spade size={30} strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text mb-1.5">
          Game App
        </h1>
        <p className="text-xs text-muted max-w-xs leading-relaxed">
          Карточные игры онлайн и сквозное E2E-шифрование диалогов
        </p>
      </div>

      {/* Центральный блок */}
      <div className="w-full max-w-sm mx-auto my-auto py-4">
        {errorMsg && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {authMode === 'initial' ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                resetState();
                setAuthMode('email_login');
              }}
              className="w-full h-13 rounded-2xl bg-input border border-white/10 text-text font-semibold text-xs flex items-center justify-center gap-2.5 active:scale-98 hover:border-accent transition-all disabled:opacity-50"
            >
              <Mail size={16} className="text-accent" />
              <span>Войти через Email</span>
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">или</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleGuestSignIn}
              className="w-full h-12 rounded-2xl bg-transparent border border-white/10 text-muted hover:text-text font-medium text-xs flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <>
                  <User size={15} />
                  <span>Быстрый гостевой вход</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between mb-0.5 px-0.5">
              <h3 className="text-sm font-semibold text-text">
                {authMode === 'email_login' ? 'Вход в профиль' : 'Регистрация'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  resetState();
                  setAuthMode('initial');
                }}
                className="text-xs text-muted hover:text-accent transition-colors"
              >
                Назад
              </button>
            </div>

            <div className="rounded-2xl bg-card border border-white/10 divide-y divide-white/5 overflow-hidden shadow-inner">
              {authMode === 'email_signup' && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Отображаемое имя"
                  className="w-full h-12 px-3.5 bg-transparent text-xs text-text placeholder-muted outline-none"
                />
              )}

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email адрес"
                className="w-full h-12 px-3.5 bg-transparent text-xs text-text placeholder-muted outline-none"
              />

              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full h-12 px-3.5 bg-transparent text-xs text-text placeholder-muted outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-2xl bg-accent text-accent-text font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-40 brass-glow mt-1"
            >
              {isLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <>
                  <span>{authMode === 'email_login' ? 'Войти' : 'Создать аккаунт'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => {
                  resetState();
                  setAuthMode(authMode === 'email_login' ? 'email_signup' : 'email_login');
                }}
                className="text-xs text-muted hover:text-accent underline underline-offset-4 transition-colors"
              >
                {authMode === 'email_login'
                  ? 'Нет аккаунта? Зарегистрироваться'
                  : 'Уже есть профиль? Войти'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="text-center text-[11px] text-muted">
        Продолжая, вы принимаете пользовательское соглашение
      </div>
    </div>
  );
};