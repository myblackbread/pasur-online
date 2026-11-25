'use client';

import React, { createContext, useCallback, useMemo, useState, useContext, useEffect, useId } from 'react';
import type { Contract } from '../shared/contract';
import type { MorphDestinationParams, MorphDirection } from './types';

type RegistryState = Map<string, Array<{ id: string; params: MorphDestinationParams }>>;

const MorphRegistryApiContext = createContext<{
    register: (type: string, id: string, params: MorphDestinationParams) => void;
    unregister: (type: string, id: string) => void;
} | null>(null);

const MorphRegistryStateContext = createContext<RegistryState>(new Map());

export const MorphRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [registry, setRegistry] = useState<RegistryState>(new Map());

    const register = useCallback((type: string, id: string, params: MorphDestinationParams) => {
        setRegistry(prev => {
            const next = new Map(prev);
            const list = next.get(type) || [];
            next.set(type, [...list, { id, params }]);
            return next;
        });
    }, []);

    const unregister = useCallback((type: string, id: string) => {
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
        <MorphRegistryApiContext.Provider value={apiValue}>
            <MorphRegistryStateContext.Provider value={registry}>
                {children}
            </MorphRegistryStateContext.Provider>
        </MorphRegistryApiContext.Provider>
    );
};

export function MorphDestination<TType extends string, TData>({
    contract,
    direction,
    ...params
}: {
    contract: Contract<TType, TData>;
    direction?: MorphDirection;
} & MorphDestinationParams<TData>) {
    const api = useContext(MorphRegistryApiContext);
    const registrarId = useId();

    const paramsRef = React.useRef({ ...params, direction });
    paramsRef.current = { ...params, direction };

    const { width, height, right, bottom, top } = params.anchorConfig;
    const resolvedDir = direction ?? params.anchorConfig.direction;

    useEffect(() => {
        if (!api) return;

        const proxyParams: MorphDestinationParams<TData> = {
            get direction() {
                return paramsRef.current.direction ?? paramsRef.current.anchorConfig.direction;
            },
            get anchorConfig() {
                return paramsRef.current.anchorConfig;
            },
            renderAnchor: () => paramsRef.current.renderAnchor(),
            renderItem: (item: TData) => paramsRef.current.renderItem?.(item),
        };

        api.register(contract.type, registrarId, proxyParams);
        return () => api.unregister(contract.type, registrarId);
    }, [contract.type, registrarId, api, width, height, right, bottom, top, resolvedDir]);

    return null;
}

export function useActiveMorphParams(type: string): MorphDestinationParams | null {
    const registry = useContext(MorphRegistryStateContext);
    const list = registry.get(type);
    return list && list.length > 0 ? list[list.length - 1].params : null;
}