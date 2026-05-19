"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, supabase } from '@/lib/supabase';
import { useAlert } from '@/components/providers/AlertProvider';
import { useTranslation } from 'react-i18next';
import { AuthForm } from '@/features/auth/components/AuthForm';

export default function AuthPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        document.documentElement.removeAttribute('data-theme');
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) router.push('/dashboard');
            else setIsCheckingAuth(false);
        });
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.push('/dashboard');
            else setIsCheckingAuth(false);
        });
        return () => subscription.unsubscribe();
    }, [router]);

    const handleSubmit = async (provider: 'google' | 'email' | 'guest', credentials?: any) => {
        const { gender, email, password } = credentials;

        if (!gender) return showAlert(t('auth_err_gender'));
        if (provider === 'email') {
            if (!email || !password) return showAlert(t('auth_err_creds'));
            if (password.length < 6) return showAlert(t('auth_err_pass_length'));
        }

        setIsLoading(true);
        try {
            await authApi.login(provider, email, password, gender);
            if (provider !== 'google') {
                router.push('/dashboard');
            }
        } catch (e: any) {
            const errKey = e.message.includes("Invalid login credentials") ? "auth_err_invalid_creds" : e.message;
            showAlert(`${t('auth_error')} ${t(errKey)}`);
            setIsLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="h-full w-full flex items-center justify-center font-bold text-theme-text">
                {t('auth_checking')}
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 safe-padding overflow-y-auto">
            <div className="w-full max-w-md">
                <AuthForm isLoading={isLoading} onSubmit={handleSubmit} />
            </div>
        </div>
    );
}