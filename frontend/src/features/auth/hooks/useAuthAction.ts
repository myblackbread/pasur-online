import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/supabase';
import { useAlert } from '@/components/providers/AlertProvider';
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
            showAlert(t('auth_err_gender'));
            return false;
        }
        if (provider === 'email') {
            if (!creds.email || !creds.password) {
                showAlert(t('auth_err_creds'));
                return false;
            }
            if (creds.password.length < 6) {
                showAlert(t('auth_err_pass_length'));
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
            showAlert(`${t('auth_error')} ${t(errKey)}`);
            setIsLoading(false); // Сбрасываем только в случае ошибки
        }
    };

    return { submitAction, isLoading };
}