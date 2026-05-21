import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/shared/api/supabase';
import { useAlert } from '@/app/providers/AlertProvider/AlertProvider';
import { useTranslation } from 'react-i18next';

export interface AuthCredentials {
    email?: string;
    password?: string;
    gender?: 'male' | 'female';
}

export type AuthProviderType = 'google' | 'email' | 'guest';

export function useAuthAction() {
    const { t } = useTranslation();
    const router = useRouter();
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState(false);

    const validate = (provider: AuthProviderType, creds: AuthCredentials) => {
        if (!creds.gender) {
            showAlert({
                title: t('auth_err_gender'),
                buttons: [{ text: t('alert_ok'), style: "cancel" }]
            });
            return false;
        }
        if (provider === 'email') {
            if (!creds.email || !creds.password) {
                showAlert({
                    title: t('auth_err_creds'),
                    buttons: [{ text: t('alert_ok'), style: "cancel" }]
                });
                return false;
            }
            if (creds.password.length < 6) {
                showAlert({
                    title: t('auth_err_pass_length'),
                    buttons: [{ text: t('alert_ok'), style: "cancel" }]
                });
                return false;
            }
        }
        return true;
    };

    const submitAction = async (provider: AuthProviderType, creds: AuthCredentials) => {
        if (!validate(provider, creds)) return;

        setIsLoading(true);
        try {
            await authApi.login(provider, creds.email, creds.password, creds.gender);
            if (provider !== 'google') {
                router.push('/dashboard');
            }
        } catch (e: any) {
            const errKey = e.message?.includes("Invalid login credentials") ? "auth_err_invalid_creds" : e.message;
            showAlert({
                title: `${t('auth_error')} ${t(errKey)}`,
                buttons: [{ text: t('alert_ok'), style: "cancel" }]
            });
            setIsLoading(false);
        }
    };

    return { submitAction, isLoading };
}