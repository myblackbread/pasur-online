'use client';

import React, { createContext, useCallback, useMemo, useState, useContext, useEffect, useId } from 'react';
import type { Contract } from '../shared/contract';

export type SheetRenderFunction = (data: any) => React.ReactNode;
type SheetRegistryState = Map<string, Array<{ id: string; fn: SheetRenderFunction }>>;

const SheetRegistryApiContext = createContext<{
    register: (params: { type: string; id: string; fn: SheetRenderFunction }) => void;
    unregister: (params: { type: string; id: string }) => void;
} | null>(null);

const SheetRegistryStateContext = createContext<SheetRegistryState>(new Map());

export const SheetRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [registry, setRegistry] = useState<SheetRegistryState>(new Map());

    const register = useCallback(({ type, id, fn }: { type: string; id: string; fn: SheetRenderFunction }) => {
        setRegistry(prev => {
            const next = new Map(prev);
            const list = next.get(type) || [];
            next.set(type, [...list, { id, fn }]);
            return next;
        });
    }, []);

    const unregister = useCallback(({ type, id }: { type: string; id: string }) => {
        setRegistry(prev => {
            const list = prev.get(type);
            if (!list) return prev;
            const filtered = list.filter(item => item.id !== id);
            const next = new Map(prev);
            if (filtered.length === 0) {
                next.delete(type);
            } else {
                next.set(type, filtered);
            }
            return next;
        });
    }, []);

    const apiValue = useMemo(() => ({ register, unregister }), [register, unregister]);

    return (
        <SheetRegistryApiContext.Provider value={apiValue}>
            <SheetRegistryStateContext.Provider value={registry}>
                {children}
            </SheetRegistryStateContext.Provider>
        </SheetRegistryApiContext.Provider>
    );
};

export function SheetDestination<TType extends string, TData>({
    contract,
    destination,
}: {
    contract: Contract<TType, TData>;
    destination: (data: TData) => React.ReactNode;
}) {
    const api = useContext(SheetRegistryApiContext);
    const registrarId = useId();

    const destRef = React.useRef(destination);
    destRef.current = destination;

    useEffect(() => {
        if (!api) return;
        const renderFn: SheetRenderFunction = (payload) => destRef.current(payload);

        api.register({ type: contract.type, id: registrarId, fn: renderFn });
        return () => api.unregister({ type: contract.type, id: registrarId });
    }, [contract.type, registrarId, api]);

    return null;
}

export function useActiveSheetRenderer({ type }: { type: string }): SheetRenderFunction | null {
    const registry = useContext(SheetRegistryStateContext);
    const list = registry.get(type);
    return list && list.length > 0 ? list[list.length - 1].fn : null;
}