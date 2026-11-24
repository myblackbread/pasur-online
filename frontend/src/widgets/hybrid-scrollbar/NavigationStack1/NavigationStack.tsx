'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { NavigationRegistryProvider, useActiveRenderer } from './Registry';
import { NavigationActionsContext, NavigationStateContext, PopOptionsContext } from './NavigationContext';
import { ScreenLayer } from './ScreenLayer';
import type {
    StackEntry,
    NavigationActions,
    NavigationState,
    PushParams,
    TransitionOptions,
    NavigationTransitionType
} from './types';

import { myGetPlatformType, myGetDefaultCornerRadius } from '../shared/platform';

export interface NavigationStackProps {
    children: React.ReactNode;
    onStackChange?: (params: { activeEntry: StackEntry | null; pop: (params?: { options?: TransitionOptions }) => void; depth: number }) => void;
    screenWrapper?: (params: { entry: StackEntry | null; isTop: boolean; content: React.ReactNode }) => React.ReactNode;
    animatePush?: boolean;
    animatePop?: boolean;
}

interface NavigationStackInnerProps extends NavigationStackProps {
    transitionType: NavigationTransitionType;
    cornerRadius: number;
}

const RouteRenderer = ({ entry }: { entry: StackEntry }) => {
    const renderFn = useActiveRenderer({ type: entry.envelope.type });

    if (!renderFn) {
        return (
            <div className="flex items-center justify-center w-full h-full">
                <AlertTriangle size={64} className="text-yellow-500" strokeWidth={1.5} />
            </div>
        );
    }

    return <>{renderFn(entry.envelope.data)}</>;
};

const NavigationStackInner = ({
    children,
    onStackChange,
    screenWrapper,
    animatePush = true,
    animatePop = true,
    transitionType,
    cornerRadius,
}: NavigationStackInnerProps) => {
    const [path, setPath] = useState<StackEntry[]>([]);
    const [navAction, setNavAction] = useState<'push' | 'pop' | 'idle'>('idle');

    const popCustomOptionsRef = useRef<TransitionOptions | undefined>(undefined);

    const pop = useCallback((params?: { options?: TransitionOptions }) => {
        popCustomOptionsRef.current = params?.options;
        setNavAction('pop');
        setPath((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
    }, []);

    const popToRoot = useCallback((params?: { options?: TransitionOptions }) => {
        popCustomOptionsRef.current = params?.options;
        setNavAction('pop');
        setPath([]);
    }, []);

    const push = useCallback(<TType extends string, TData>(params: PushParams<TType, TData>) => {
        const { contract, options } = params;
        const data = (params as any).data;

        const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `screen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        setNavAction('push');
        setPath((prev) => [
            ...prev,
            {
                id: newId,
                title: options?.title,
                pushOptions: { animated: options?.animated },
                envelope: contract.create(data),
            },
        ]);
    }, []);

    const depth = path.length;
    const isRoot = depth === 0;
    const activeEntry = isRoot ? null : path[path.length - 1];

    const onStackChangeRef = useRef(onStackChange);
    onStackChangeRef.current = onStackChange;

    useEffect(() => {
        onStackChangeRef.current?.({ activeEntry, pop, depth });
    }, [path, pop]);

    const actionsValue = useMemo<NavigationActions>(() => ({ push, pop, popToRoot }), [push, pop, popToRoot]);
    const stateValue = useMemo<NavigationState>(() => ({ depth, isRoot, activeEntry }), [depth, isRoot, activeEntry]);

    const isCurrentPushAnimated = activeEntry?.pushOptions?.animated ?? animatePush;
    const isCurrentPopAnimated = popCustomOptionsRef.current?.animated ?? animatePop;
    const isCurrentActionAnimated = navAction === 'push' ? isCurrentPushAnimated : isCurrentPopAnimated;

    return (
        <NavigationActionsContext.Provider value={actionsValue}>
            <NavigationStateContext.Provider value={stateValue}>
                <PopOptionsContext.Provider value={popCustomOptionsRef}>
                    <div className="relative w-full h-full overflow-hidden select-none bg-background">
                        <ScreenLayer
                            isActive={isRoot}
                            zIndex={0}
                            isRoot={true}
                            isActionAnimated={isCurrentActionAnimated}
                            globalAnimatePop={animatePop}
                            transitionType={transitionType}
                            cornerRadius={cornerRadius}
                        >
                            {screenWrapper ? screenWrapper({ entry: null, isTop: isRoot, content: children }) : children}
                        </ScreenLayer>

                        <AnimatePresence initial={false}>
                            {path.map((entry, index) => {
                                const isTop = index === path.length - 1;
                                const innerContent = <RouteRenderer entry={entry} />;
                                const wrappedContent = screenWrapper ? screenWrapper({ entry, isTop, content: innerContent }) : innerContent;

                                return (
                                    <ScreenLayer
                                        key={entry.id}
                                        isActive={isTop}
                                        zIndex={index + 1}
                                        isRoot={false}
                                        isActionAnimated={isCurrentActionAnimated}
                                        globalAnimatePop={animatePop}
                                        transitionType={transitionType}
                                        cornerRadius={cornerRadius}
                                    >
                                        {wrappedContent}
                                    </ScreenLayer>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </PopOptionsContext.Provider>
            </NavigationStateContext.Provider>
        </NavigationActionsContext.Provider>
    );
};

// Вся магия инкапсулирована здесь
export const NavigationStack = (props: NavigationStackProps) => {
    const platform = myGetPlatformType();
    const transitionType: NavigationTransitionType = platform === 'ios' ? 'slide' : 'scale';
    const cornerRadius = myGetDefaultCornerRadius({ platform });

    return (
        <NavigationRegistryProvider>
            <NavigationStackInner
                {...props}
                transitionType={transitionType}
                cornerRadius={cornerRadius}
            />
        </NavigationRegistryProvider>
    );
};