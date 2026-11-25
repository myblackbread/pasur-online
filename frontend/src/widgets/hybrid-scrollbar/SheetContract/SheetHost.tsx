'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { SheetContext } from './SheetContext';
import { useActiveSheetRenderer } from './SheetRegistry';
import { MYHubBottomSheetRenderer } from '../HubBottomSheet';
import type { SheetEntry } from './types';

const SheetRouteRenderer = ({
    entry,
    windowHeight,
    onClose
}: {
    entry: SheetEntry;
    windowHeight: number;
    onClose: () => void;
}) => {
    const renderFn = useActiveSheetRenderer({ type: entry.envelope.type });

    const content = renderFn ? renderFn(entry.envelope.data) : (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-neutral-900 rounded-[inherit]">
            <AlertTriangle size={48} className="text-yellow-500 mb-4" />
            <p className="text-white text-center">Шторка не зарегистрирована<br /><span className="text-neutral-500 text-sm mt-1">{entry.envelope.type}</span></p>
        </div>
    );

    return (
        <MYHubBottomSheetRenderer
            item={{
                id: entry.id,
                sourceId: entry.sourceId,
                detents: entry.detents,
                content: content,
                onDismiss: () => {
                    entry.onDismiss?.();
                    onClose();
                }
            }}
            windowHeight={windowHeight}
        />
    );
};

export const SheetHost: React.FC = () => {
    const ctx = React.useContext(SheetContext);
    if (!ctx) return null;

    const { activeSheet, windowHeight, close } = ctx;

    return (
        <AnimatePresence mode="wait">
            {activeSheet && (
                <SheetRouteRenderer
                    key={activeSheet.id}
                    entry={activeSheet}
                    windowHeight={windowHeight}
                    onClose={() => close(activeSheet.id)}
                />
            )}
        </AnimatePresence>
    );
};