"use client";

import React from 'react';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { useAuthAction } from '@/features/auth/hooks/useAuthAction';

export default function AuthPage() {
    const { submitAction, isLoading } = useAuthAction();

    return (
        <div className="min-h-full grid place-items-center safe-padding overflow-y-auto bg-theme-main">
            <div className="w-full max-w-md pb-8">
                <AuthForm isLoading={isLoading} onSubmit={submitAction} />
            </div>
        </div>
    );
}