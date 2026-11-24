'use client';

import React from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { myGetDefaultCornerRadius, myGetDefaultSheetPadding } from './shared/platform/MYDeviceMetrics';
import { myResolveDetentHeight, MYPresentationDetent } from './my/MYPresentationDetent';

const DEFAULT_DETENTS: MYPresentationDetent[] = ['medium'];

export interface HubBottomSheetItem {
    id: string;
    sourceId?: string;
    detents?: MYPresentationDetent[];
    content: React.ReactNode;
    onDismiss: () => void;
}

export const MYHubBottomSheetRenderer: React.FC<{ item: HubBottomSheetItem; windowHeight: number }> = ({ item, windowHeight }) => {
    const detents: MYPresentationDetent[] = item.detents && item.detents.length > 0
        ? item.detents
        : DEFAULT_DETENTS;

    const [currentSnapIndex, setCurrentSnapIndex] = React.useState(0);

    React.useEffect(() => {
        setCurrentSnapIndex((prev) => Math.min(prev, detents.length - 1));
    }, [detents.length]);

    const isMax = currentSnapIndex === detents.length - 1;

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const isDraggingDown = info.offset.y > 50 || info.velocity.y > 500;
        const isDraggingUp = info.offset.y < -50 || info.velocity.y < -500;

        if (isDraggingDown) {
            if (currentSnapIndex > 0) {
                setCurrentSnapIndex((prev) => prev - 1);
            }
            // Закрытие шторки свайпом отменено
        } else if (isDraggingUp) {
            if (currentSnapIndex < detents.length - 1) {
                setCurrentSnapIndex((prev) => prev + 1);
            }
        }
    };

    const touchStartY = React.useRef(0);
    const isPullingDown = React.useRef(false);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isMax) return;
        touchStartY.current = e.touches[0].clientY;
        isPullingDown.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isMax) return;

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - touchStartY.current;
        const isAtTop = e.currentTarget.scrollTop <= 0;

        if (isAtTop && deltaY > 30) {
            if (!isPullingDown.current) {
                isPullingDown.current = true;
                if (currentSnapIndex > 0) {
                    setCurrentSnapIndex((prev) => prev - 1);
                }
            }
        } else if (!isAtTop) {
            touchStartY.current = currentY;
        }
    };

    const handleTouchEnd = () => {
        touchStartY.current = 0;
        isPullingDown.current = false;
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!isMax) return;
        if (e.currentTarget.scrollTop <= 0 && e.deltaY < -20) {
            if (currentSnapIndex > 0) {
                setCurrentSnapIndex((prev) => prev - 1);
            }
        }
    };

    const safeSnapIndex = Math.min(currentSnapIndex, detents.length - 1);
    const activeDetent = detents[safeSnapIndex] ?? detents[0];
    const sheetHeight = myResolveDetentHeight({
        detent: activeDetent,
        windowHeight,
    });

    const borderRadius = myGetDefaultCornerRadius();
    const paddingStyle = myGetDefaultSheetPadding().toStyle({ property: 'padding' });

    return (
        <>
            <motion.div
                key={`overlay-${item.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={item.onDismiss}
                className="absolute inset-0 z-60 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />

            <motion.div
                key={`sheet-${item.id}`}
                layoutId={item.sourceId}
                initial={item.sourceId ? undefined : { scale: 0.85, opacity: 0, y: 40 }}
                animate={item.sourceId ? { height: sheetHeight } : { scale: 1, opacity: 1, y: 0, height: sheetHeight }}
                exit={item.sourceId ? undefined : { scale: 0.9, opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280, mass: 0.8 }}
                drag={isMax ? false : 'y'}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                style={{
                    touchAction: isMax ? 'pan-y' : 'none',
                    ...paddingStyle, // Здесь теперь одинаковый паддинг со всех 3 сторон
                }}
                className="absolute bottom-0 left-0 right-0 z-61 flex flex-col pointer-events-auto"
            >
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onWheel={handleWheel}
                    className="w-full h-full scrollbar-none"
                    style={{
                        overflowY: isMax ? 'auto' : 'hidden',
                        overflowX: 'hidden',
                        borderRadius: `${borderRadius}px`, // Скругления на все 4 угла
                        transform: 'translateZ(0)',
                        // Убрали принудительный env(safe-area), оставив это на совести контента
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {item.content}
                </div>
            </motion.div>
        </>
    );
};