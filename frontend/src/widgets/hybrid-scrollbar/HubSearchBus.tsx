'use client';

import React from 'react';
import { useHybridHistory } from './HybridHistoryManager';

export type SearchSubmitHandler = (text: string) => void;
export type SearchChangeHandler = (text: string) => void;

export interface HubSearchConfig {
    placeholder?: string;
    initialValue?: string;
    onChange?: SearchChangeHandler;
    onSubmit?: SearchSubmitHandler;
}

export interface InternalHubSearchConfig {
    placeholder?: string;
    onQueryChange: (text: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (text: string) => void;
}

interface HubSearchContextType {
    activeConfig: InternalHubSearchConfig | null;
    isSearchOpen: boolean;
    setIsSearchOpen: (isOpen: boolean) => void;
    query: string;
    setQuery: (q: string) => void;
    _registerScreen: (screenId: string, config: InternalHubSearchConfig) => void;
    _unregisterScreen: (screenId: string) => void;
    _syncFromScreen: (q: string, open: boolean) => void;
}

export const HubSearchContext = React.createContext<HubSearchContextType | null>(null);

export const HubSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeConfig, setActiveConfig] = React.useState<InternalHubSearchConfig | null>(null);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');

    const activeScreenIdRef = React.useRef<string | null>(null);
    const activeConfigRef = React.useRef<InternalHubSearchConfig | null>(null);

    const _registerScreen = React.useCallback((screenId: string, config: InternalHubSearchConfig) => {
        activeScreenIdRef.current = screenId;
        activeConfigRef.current = config;
        setActiveConfig(config);
    }, []);

    const _unregisterScreen = React.useCallback((screenId: string) => {
        if (activeScreenIdRef.current === screenId) {
            activeScreenIdRef.current = null;
            activeConfigRef.current = null;
            setActiveConfig(null);
            setIsSearchOpen(false);
            setQuery('');
        }
    }, []);

    const _syncFromScreen = React.useCallback((q: string, open: boolean) => {
        setQuery(q);
        setIsSearchOpen(open);
    }, []);

    const handleSetIsSearchOpen = React.useCallback((open: boolean) => {
        setIsSearchOpen(open);
        activeConfigRef.current?.onOpenChange(open);
    }, []);

    const handleSetQuery = React.useCallback((q: string) => {
        setQuery(q);
        activeConfigRef.current?.onQueryChange(q);
    }, []);


    useHybridHistory(isSearchOpen, () => handleSetIsSearchOpen(false));

    const value = React.useMemo(() => ({
        activeConfig,
        isSearchOpen,
        query,
        setIsSearchOpen: handleSetIsSearchOpen,
        setQuery: handleSetQuery,
        _registerScreen,
        _unregisterScreen,
        _syncFromScreen,
    }), [
        activeConfig,
        isSearchOpen,
        query,
        handleSetIsSearchOpen,
        handleSetQuery,
        _registerScreen,
        _unregisterScreen,
        _syncFromScreen
    ]);

    return (
        <HubSearchContext.Provider value={value}>
            {children}
        </HubSearchContext.Provider>
    );
};