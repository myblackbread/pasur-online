"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fbManager } from '@/lib/supabaseManager';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/AlertProvider';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AuthPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { showAlert } = useAlert();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        document.documentElement.removeAttribute('data-theme');

        // 🟢 ПРОВЕРКА СЕССИИ ЧЕРЕЗ SUPABASE
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) router.push('/dashboard');
            else setIsCheckingAuth(false);
        });

        // Первичная проверка
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.push('/dashboard');
            else setIsCheckingAuth(false);
        });

        return () => subscription.unsubscribe();
    }, [router]);

    if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center font-bold text-theme-text">{t('auth_checking')}</div>;

    const handleLogin = async (provider: 'google' | 'email' | 'guest') => {
        if (!gender) return showAlert(t('auth_err_gender'));
        if (provider === 'email') {
            if (!email || !password) return showAlert(t('auth_err_creds'));
            if (password.length < 6) return showAlert(t('auth_err_pass_length'));
        }

        setIsLoading(true);
        try {
            await fbManager.login(provider, email, password, gender);
            router.push('/dashboard');
        } catch (e: any) {
            showAlert(`${t('auth_error')} ${e.message}`);
            setIsLoading(false);
        }
    };

    return (
        // 🟢 Добавили flex-col
        <div className="min-h-screen flex flex-col items-center justify-center p-4">

            {/* 🟢 Добавили обертку для свитчера и карточки авторизации */}
            <div className="w-full max-w-md">

                {/* 🟢 Сам свитчер */}
                <div className="mb-4 rounded-3xl overflow-hidden shadow-sm border-4 border-theme-border">
                    <LanguageSwitcher />
                </div>

                {/* Твоя карточка входа (убрали отсюда w-full max-w-md, так как они теперь на родителе) */}
                <div className="bg-theme-panel p-8 rounded-3xl shadow-2xl border-4 border-theme-border text-center">
                    <h1 className="text-4xl font-extrabold mb-2 text-theme-primary">♠ {t('app_title')} ♥</h1>
                    <p className="opacity-70 mb-6 font-medium text-theme-text">{t('auth_subtitle')}</p>

                    <div className="mb-6">
                        <p className="text-sm opacity-70 mb-2 text-left px-1 font-medium text-theme-text">{t('auth_gender')}</p>
                        <div className="flex gap-2 bg-theme-main p-1 rounded-xl border-2 border-theme-border/50">
                            <button onClick={() => setGender('male')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${gender === 'male' ? 'bg-blue-600 text-white' : 'text-theme-text opacity-60 hover:opacity-100'}`}>👨 {t('auth_male')}</button>
                            <button onClick={() => setGender('female')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${gender === 'female' ? 'bg-pink-600 text-white' : 'text-theme-text opacity-60 hover:opacity-100'}`}>👩 {t('auth_female')}</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button onClick={() => handleLogin('guest')} disabled={!gender || isLoading} className="bg-amber-500 hover:bg-amber-400 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg">🎭 {t('auth_guest')}</button>
                        <div className="flex items-center my-2">
                            <div className="flex-1 border-t-2 border-theme-border opacity-30"></div>
                            <span className="px-3 opacity-50 text-sm font-bold text-theme-text">{t('auth_or')}</span>
                            <div className="flex-1 border-t-2 border-theme-border opacity-30"></div>
                        </div>
                        <button onClick={() => handleLogin('google')} disabled={!gender || isLoading} className="bg-theme-main border-2 border-theme-border font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-theme-border hover:text-white transition-colors text-theme-text disabled:opacity-50">🌐 {t('auth_google')}</button>

                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth_email')} className="bg-theme-main border-2 border-theme-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-theme-primary outline-none text-theme-text font-medium" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth_password')} className="bg-theme-main border-2 border-theme-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-theme-primary outline-none text-theme-text font-medium" />

                        <button onClick={() => handleLogin('email')} className="bg-theme-primary hover:opacity-80 text-white font-bold py-3 rounded-xl transition-opacity disabled:opacity-50 shadow-md" disabled={!gender || isLoading}>{t('auth_email_btn')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}