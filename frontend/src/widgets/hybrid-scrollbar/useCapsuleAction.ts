'use client';

import { useEffect, useContext, useId, useRef } from 'react';
import { MYCapsuleActionContext } from './MYCapsuleActionBus';
import { MYHubRouteContext } from './my/HubRouteContext';

export interface UseCapsuleActionParams {
    icon?: React.ElementType;
    onAction: (morphId?: string) => void;
}

export function useCapsuleAction({ icon, onAction }: UseCapsuleActionParams) {
    const ctx = useContext(MYCapsuleActionContext);
    const routeCtx = useContext(MYHubRouteContext);
    const id = useId();

    const screenId = routeCtx?.screenId || 'unknown-screen';
    const isActive = routeCtx?.isActive ?? true;

    // Реф сохраняет актуальную функцию, не провоцируя перезапуск useEffect
    const onActionRef = useRef(onAction);
    onActionRef.current = onAction;

    // СТРОГО ВЫДЕЛЯЕМ СТАБИЛЬНЫЕ МЕТОДЫ ДО ЭФФЕКТА!
    // Их ссылки никогда не меняются, поэтому бесконечного цикла не будет.
    const registerRequest = ctx?.registerRequest;
    const unregisterRequest = ctx?.unregisterRequest;

    useEffect(() => {
        if (!registerRequest || !unregisterRequest || !isActive) return;
        
        const reqId = `capsule-req-${id}`;
        registerRequest({
            id: reqId,
            screenId,
            icon,
            onAction: (morphId) => onActionRef.current(morphId)
        });

        return () => unregisterRequest(reqId);
    }, [registerRequest, unregisterRequest, isActive, screenId, id, icon]);
}