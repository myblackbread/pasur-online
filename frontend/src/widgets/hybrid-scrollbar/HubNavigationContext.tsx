'use client';

import React from 'react';
import { HybridHistoryManager } from './HybridHistoryManager';

export interface HubBackAction {
  canGoBack: boolean;
  action: (params?: { options?: { animated?: boolean } }) => void;
  title?: string;
}

export interface SetHubOptions {
    recordHistory?: boolean;
}

interface HubNavigationContextType {
    activeHubId: string;
    setActiveHubId: (id: string, options?: SetHubOptions) => void;
    commitHubHistory: (id: string) => void;
    registerHubBackAction: (
        hubId: string,
        action: HubBackAction | null
    ) => void;
    currentBackAction: HubBackAction | null;
}

export const HubNavigationContext = React.createContext<HubNavigationContextType | null>(null);

export const useHubNavigation = () => {
    const ctx = React.useContext(HubNavigationContext);
    if (!ctx) throw new Error('useHubNavigation must be used within HybridScrollView or HubNavigationProvider');
    return ctx;
};

const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export const HubNavigationProvider: React.FC<{
    children: React.ReactNode;
    initialHubId?: string;
}> = ({ children, initialHubId = '' }) => {
    const [activeHubId, setActiveHubIdState] = React.useState<string>(initialHubId);
    const [backActions, setBackActions] = React.useState<Record<string, HubBackAction | null>>({});

    useIsomorphicLayoutEffect(() => {
        HybridHistoryManager.init(initialHubId);
    }, [initialHubId]);

    const setActiveHubId = React.useCallback((id: string, options?: SetHubOptions) => {
        const recordHistory = options?.recordHistory ?? true;
        
        if (recordHistory) {
            // Вызываем ДО изменения стейта (моментальная реакция URL)
            HybridHistoryManager.pushHub(id);
        }

        setActiveHubIdState(id);
    }, []);

    const commitHubHistory = React.useCallback((id: string) => {
        // Коммитим транзакцию ДО изменения стейта
        HybridHistoryManager.commitTransaction(id);
        setActiveHubIdState(id);
    }, []);

    const registerHubBackAction = React.useCallback((hubId: string, action: HubBackAction | null) => {
        setBackActions((prev) => {
            if (prev[hubId] === action) return prev;
            return { ...prev, [hubId]: action };
        });
    }, []);

    const currentBackAction = React.useMemo(() => {
        return backActions[activeHubId] ?? null;
    }, [backActions, activeHubId]);

    const contextValue = React.useMemo(
        () => ({
            activeHubId,
            setActiveHubId,
            commitHubHistory,
            registerHubBackAction,
            currentBackAction,
        }),
        [activeHubId, setActiveHubId, commitHubHistory, registerHubBackAction, currentBackAction]
    );

    return (
        <HubNavigationContext.Provider value={contextValue}>
            {children}
        </HubNavigationContext.Provider>
    );
};