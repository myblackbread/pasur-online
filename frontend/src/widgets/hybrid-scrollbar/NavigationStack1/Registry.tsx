import React, { createContext, useCallback, useMemo, useState, useContext, useRef, useEffect, useId } from 'react';
import type { Contract } from '../shared/contract';

export type RenderFunction = (data: any) => React.ReactNode;

type RegistryState = Map<string, Array<{ id: string; fn: RenderFunction }>>;

const RegistryApiContext = createContext<{
    register: (params: { type: string; id: string; fn: RenderFunction }) => void;
    unregister: (params: { type: string; id: string }) => void;
} | null>(null);

const RegistryStateContext = createContext<RegistryState>(new Map());

export const NavigationRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [registry, setRegistry] = useState<RegistryState>(new Map());

    const register = useCallback(({ type, id, fn }: { type: string; id: string; fn: RenderFunction }) => {
        setRegistry((prev) => {
            const next = new Map(prev);
            const list = next.get(type) || [];
            next.set(type, [...list, { id, fn }]);
            return next;
        });
    }, []);

    const unregister = useCallback(({ type, id }: { type: string; id: string }) => {
        setRegistry((prev) => {
            const list = prev.get(type);
            if (!list) return prev;

            const filtered = list.filter((item) => item.id !== id);
            const next = new Map(prev);

            if (filtered.length === 0) {
                next.delete(type);
            } else {
                next.set(type, filtered);
            }

            return next;
        });
    }, []);

    // Ссылки на эти методы теперь не изменятся никогда
    const apiValue = useMemo(() => ({ register, unregister }), [register, unregister]);

    return (
        <RegistryApiContext.Provider value={apiValue}>
            <RegistryStateContext.Provider value={registry}>
                {children}
            </RegistryStateContext.Provider>
        </RegistryApiContext.Provider>
    );
};

export function NavigationDestination<TType extends string, TData>({
    contract,
    destination,
}: {
    // ВАЖНО: Теперь TypeScript видит жесткую связь между контрактом и TData
    contract: Contract<TType, TData>; 
    destination: (data: TData) => React.ReactNode;
}) {
    const api = useContext(RegistryApiContext);
    const registrarId = useId();

    const destRef = useRef(destination);
    destRef.current = destination;

    useEffect(() => {
        if (!api) return;
        const renderFn: RenderFunction = (payload) => destRef.current(payload);
        
        api.register({ type: contract.type, id: registrarId, fn: renderFn });
        return () => api.unregister({ type: contract.type, id: registrarId });
    }, [contract.type, registrarId, api]);

    return null;
}

export function useActiveRenderer({ type }: { type: string }): RenderFunction | null {
    const registry = useContext(RegistryStateContext);
    const list = registry.get(type);
    return list && list.length > 0 ? list[list.length - 1].fn : null;
}