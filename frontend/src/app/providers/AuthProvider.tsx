"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/shared/api/supabase';
import { Session } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';

interface AuthContextType {
    session: Session | null;
}

const AuthContext = createContext<AuthContextType>({ session: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    
    const [session, setSession] = useState<Session | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            const { data } = await supabase.auth.getSession();
            if (mounted) {
                setSession(data.session);
                setIsCheckingAuth(false);
                handleRouting(data.session);
            }
        };

        const handleRouting = (currentSession: Session | null) => {
            const isAuthRoute = pathname === '/';
            if (currentSession && isAuthRoute) {
                router.push('/dashboard');
            } else if (!currentSession && !isAuthRoute) {
                // Если мы на защищенном роуте без сессии — выкидываем на главную
                router.push('/');
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (mounted) {
                setSession(newSession);
                handleRouting(newSession);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [pathname, router]);

    // Единый экран загрузки для всего приложения при проверке сессии
    if (isCheckingAuth) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-theme-main text-theme-text safe-padding">
                <span className="text-4xl font-black text-theme-primary mb-4 animate-pulse">♠ Pasur ♥</span>
                <span className="font-bold opacity-70">{t('auth_checking', 'Проверка сессии...')}</span>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ session }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);