'use client';

import React, { useContext } from 'react';
import { HybridScrollViewInner, type HybridScrollViewProps as InnerProps } from './HybridScrollViewInner';
import { MYCapsuleActionProvider } from './MYCapsuleActionBus';
import { HubNavigationProvider } from './HubNavigationContext';
import { HubSearchProvider } from './HubSearchBus';
import {
    HubNotificationProvider,
    type HubNotification,
    type MYMorphState,
} from './HubNotificationBus';
import { SheetProvider, SheetContext } from './SheetContract';

// ДОБАВЛЕН ИМПОРТ
import { MorphRegistryProvider } from './morph-list';

export interface HybridScrollViewProps extends InnerProps {
    initialHubId?: string;
    notifications?: HubNotification[];
    renderNotificationCard?: (
        notification: HubNotification,
        morphState: MYMorphState,
        cornerRadius: number
    ) => React.ReactNode;
}

export const HybridScrollView: React.FC<HybridScrollViewProps> = ({
    screens,
    initialHubId,
    notifications,
    renderNotificationCard,
    onSwipeBlocked,
}) => {
    const resolvedInitialHubId = initialHubId || screens[0]?.id || '';
    const hasGlobalSheet = useContext(SheetContext) !== null;

    const innerContent = (
        // ОБЁРТКА РЕЕСТРА МОРФИНГА
        <MorphRegistryProvider>
            <HubNavigationProvider initialHubId={resolvedInitialHubId}>
                <HubSearchProvider>
                    <HubNotificationProvider notifications={notifications} renderCard={renderNotificationCard}>
                        <MYCapsuleActionProvider>
                            <HybridScrollViewInner screens={screens} onSwipeBlocked={onSwipeBlocked} />
                        </MYCapsuleActionProvider>
                    </HubNotificationProvider>
                </HubSearchProvider>
            </HubNavigationProvider>
        </MorphRegistryProvider>
    );

    return hasGlobalSheet ? innerContent : <SheetProvider>{innerContent}</SheetProvider>;
};

HybridScrollView.displayName = 'HybridScrollView';
export type { ScrollScreen } from './HybridScrollViewInner';