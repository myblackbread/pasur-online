'use client';

import React from 'react';

export interface MYCapsuleActionRequest {
    id: string;
    screenId: string;
    icon?: React.ElementType;
    label?: string;
    onAction: (morphId?: string) => void;
}

interface MYCapsuleActionContextType {
    requests: MYCapsuleActionRequest[];
    registerRequest: (req: MYCapsuleActionRequest) => void;
    unregisterRequest: (id: string) => void;
}

export const MYCapsuleActionContext = React.createContext<MYCapsuleActionContextType | null>(null);

export const MYCapsuleActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [requests, setRequests] = React.useState<MYCapsuleActionRequest[]>([]);

    const registerRequest = React.useCallback((req: MYCapsuleActionRequest) => {
        setRequests(prev => {
            const idx = prev.findIndex(r => r.id === req.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = req;
                return next;
            }
            return [...prev, req];
        });
    }, []);

    const unregisterRequest = React.useCallback((id: string) => {
        setRequests(prev => prev.filter(r => r.id !== id));
    }, []);

    const value = React.useMemo(() => ({ requests, registerRequest, unregisterRequest }), [requests, registerRequest, unregisterRequest]);

    return (
        <MYCapsuleActionContext.Provider value={value}>
            {children}
        </MYCapsuleActionContext.Provider>
    );
};