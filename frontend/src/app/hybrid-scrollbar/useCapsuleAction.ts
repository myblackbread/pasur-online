'use client';

import { useEffect, useContext, useId, useRef } from 'react';
import { MYCapsuleActionContext } from './MYCapsuleActionBus';
import { MYHubRouteContext } from './my/HubRouteContext';

export interface UseCapsuleActionParams {
    icon?: React.ElementType;
    label?: string;
    onAction: (morphId?: string) => void;
}

export function useCapsuleAction({ icon, label, onAction }: UseCapsuleActionParams) {
    const ctx = useContext(MYCapsuleActionContext);
    const routeCtx = useContext(MYHubRouteContext);
    const id = useId();

    const screenId = routeCtx?.screenId || 'unknown-screen';
    const isActive = routeCtx?.isActive ?? true;

    const onActionRef = useRef(onAction);
    onActionRef.current = onAction;

    const registerRequest = ctx?.registerRequest;
    const unregisterRequest = ctx?.unregisterRequest;

    useEffect(() => {
        if (!registerRequest || !unregisterRequest || !isActive) return;

        const reqId = `capsule-req-${id}`;
        registerRequest({
            id: reqId,
            screenId,
            icon,
            label,
            onAction: (morphId) => onActionRef.current(morphId)
        });

        return () => unregisterRequest(reqId);
    }, [registerRequest, unregisterRequest, isActive, screenId, id, icon, label]);
}