'use client';

import { createContext, useContext } from 'react';
import type { OpenSheetParams, SheetEntry } from './types';

export interface SheetContextType {
    open: <TType extends string, TData>(params: OpenSheetParams<TType, TData>) => void;
    close: (id?: string) => void;
    hasActiveSheet: boolean;
    activeSheet: SheetEntry | null;
    windowHeight: number;
}

export const SheetContext = createContext<SheetContextType | null>(null);

export function useSheet(): SheetContextType {
    const context = useContext(SheetContext);
    if (!context) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('useSheet called outside of SheetProvider.');
        }
        return {
            open: () => {},
            close: () => {},
            hasActiveSheet: false,
            activeSheet: null,
            windowHeight: 0,
        };
    }
    return context;
}