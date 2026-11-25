'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { SheetContext } from './SheetContext';
import { SheetRegistryProvider } from './SheetRegistry';
import { useHybridHistory } from '../HybridHistoryManager';
import type { SheetEntry, OpenSheetParams } from './types';

export const SheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queue, setQueue] = useState<SheetEntry[]>([]);
    const [windowHeight, setWindowHeight] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setWindowHeight(window.innerHeight);

        let rafId: number | null = null;
        const handleResize = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(() => {
                setWindowHeight(window.innerHeight);
                rafId = null;
            });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (rafId !== null) window.cancelAnimationFrame(rafId);
        };
    }, []);

    const open = useCallback(<TType extends string, TData>(params: OpenSheetParams<TType, TData>) => {
        const { contract, options } = params;
        const data = (params as any).data;

        const newId = `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const entry: SheetEntry = {
            id: newId,
            // ВОТ ОНО: Если sourceId не передан явно, ВСЕГДА используем 'more-sheet'
            // Именно это связывает пилюлю контроллбара и шторку для Framer Motion!
            sourceId: options?.sourceId || 'more-sheet',
            ...options,
            envelope: contract.create(data)
        };

        setQueue(prev => [...prev, entry]);
    }, []);

    const close = useCallback((id?: string) => {
        setQueue(prev => {
            if (prev.length === 0) return prev;
            if (!id) return prev.slice(0, -1);
            return prev.filter(q => q.id !== id);
        });
    }, []);

    const hasActiveSheet = queue.length > 0;
    const activeSheet = hasActiveSheet ? queue[queue.length - 1] : null;

    useHybridHistory(hasActiveSheet, () => {
        if (activeSheet) {
            activeSheet.onDismiss?.();
            close(activeSheet.id);
        }
    });

    const ctxValue = useMemo(() => ({ open, close, hasActiveSheet, activeSheet, windowHeight }),
        [open, close, hasActiveSheet, activeSheet, windowHeight]);

    return (
        <SheetContext.Provider value={ctxValue}>
            <SheetRegistryProvider>
                {children}
            </SheetRegistryProvider>
        </SheetContext.Provider>
    );
};