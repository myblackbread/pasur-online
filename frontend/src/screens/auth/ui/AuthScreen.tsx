"use client"

import { AuthForm } from '@/features/auth-by-email/ui/AuthForm';
import { useAuthAction } from '@/features/auth-by-email/model/useAuthAction';

export default function AuthScreen() {
    const { submitAction, isLoading } = useAuthAction();

    return (
        <div className="min-h-full grid place-items-center safe-padding overflow-y-auto bg-theme-main">
            <div className="w-full max-w-md pb-8">
                <AuthForm isLoading={isLoading} onSubmit={submitAction} />
            </div>
        </div>
    );
}