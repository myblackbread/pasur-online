'use client';

import React, { useMemo, useEffect } from 'react';
import { useHubNavigation } from './HubNavigationContext';
import { NavigationStack } from './NavigationStack1';
import type { StackEntry } from './NavigationStack1';
import { MYHubRouteContext } from './my/HubRouteContext';
import { HybridHistoryManager } from './HybridHistoryManager';

const RouteContextProvider = React.memo(({
    screenId,
    isActive,
    children
}: {
    screenId: string;
    isActive: boolean;
    children: React.ReactNode;
}) => {
    const value = useMemo(() => ({ screenId, isActive }), [screenId, isActive]);

    return (
        <MYHubRouteContext.Provider value={value}>
            {children}
        </MYHubRouteContext.Provider>
    );
});
RouteContextProvider.displayName = 'RouteContextProvider';

export const HubNavigationStack: React.FC<{
    hubId: string;
    rootContent: React.ReactNode;
    rootTitle?: string;
}> = ({ hubId, rootContent, rootTitle }) => {
    const { activeHubId, registerHubBackAction } = useHubNavigation();
    const isHubActive = activeHubId === hubId;

    const historyTokensRef = React.useRef<{ id: string }[]>([]);

    // Инициализация дефолтного тайтла корня хаба
    useEffect(() => {
        if (historyTokensRef.current.length === 0 && rootTitle) {
            registerHubBackAction(hubId, { canGoBack: false, action: () => { }, title: rootTitle });
        }
    }, [hubId, rootTitle, registerHubBackAction]);

    const handleStackChange = React.useCallback(
        ({ activeEntry, pop, depth }: { activeEntry: StackEntry | null; pop: () => void; depth: number }) => {
            if (activeEntry !== null) {
                registerHubBackAction(hubId, {
                    canGoBack: true,
                    action: pop,
                    title: activeEntry.title || rootTitle
                });
            } else {
                registerHubBackAction(hubId, rootTitle ? { canGoBack: false, action: () => { }, title: rootTitle } : null);
            }

            const currentTokens = historyTokensRef.current;

            if (depth > currentTokens.length) {
                const delta = depth - currentTokens.length;
                for (let i = 0; i < delta; i++) {
                    const tokenId = HybridHistoryManager.pushToken();
                    currentTokens.push({ id: tokenId });
                }
            } else if (depth < currentTokens.length) {
                const delta = currentTokens.length - depth;
                for (let i = 0; i < delta; i++) {
                    const token = currentTokens.pop();
                    if (token) {
                        HybridHistoryManager.burnToken(token.id);
                    }
                }
            }
        },
        [hubId, rootTitle, registerHubBackAction]
    );

    return (
        <NavigationStack
            animatePush={true}
            animatePop={true}
            onStackChange={handleStackChange}
            screenWrapper={({ entry, isTop, content }) => {
                const screenId = entry ? entry.id : `${hubId}-root`;
                return (
                    <RouteContextProvider screenId={screenId} isActive={isHubActive && isTop}>
                        {content}
                    </RouteContextProvider>
                );
            }}
        >
            {rootContent}
        </NavigationStack>
    );
};