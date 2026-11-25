'use client';

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
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

/**
 * Нативная формула Apple UIScrollView / UISheetPresentationController для резинового сопротивления
 */
function rubberBand(distance: number, dimension: number, coefficient = 0.55): number {
    if (distance <= 0) return 0;
    if (dimension <= 0) return distance * 0.3;
    return (distance * coefficient * dimension) / (dimension + coefficient * distance);
}

/**
 * Поиск реального скроллируемого контейнера внутри модалки
 */
function getScrollableParent(target: HTMLElement | null, boundary: HTMLElement | null): HTMLElement | null {
    let curr = target;
    while (curr && curr !== boundary && curr !== document.body) {
        const style = window.getComputedStyle(curr);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && curr.scrollHeight > curr.clientHeight) {
            return curr;
        }
        curr = curr.parentElement;
    }
    if (boundary) {
        const style = window.getComputedStyle(boundary);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && boundary.scrollHeight > boundary.clientHeight) {
            return boundary;
        }
    }
    return null;
}

export const MYHubBottomSheetRenderer: React.FC<{ item: HubBottomSheetItem; windowHeight: number }> = ({ item, windowHeight }) => {
    const rawDetents = item.detents && item.detents.length > 0
        ? item.detents
        : DEFAULT_DETENTS;

    // Сортировка детентов по высоте
    const detents = useMemo(() => {
        return [...rawDetents].sort((a, b) => {
            const hA = myResolveDetentHeight({ detent: a, windowHeight });
            const hB = myResolveDetentHeight({ detent: b, windowHeight });
            return hA - hB;
        });
    }, [rawDetents, windowHeight]);

    const initialIndex = useMemo(() => {
        const first = rawDetents[0];
        const idx = detents.indexOf(first);
        return idx >= 0 ? idx : 0;
    }, [rawDetents, detents]);

    const [currentSnapIndex, setCurrentSnapIndex] = useState(initialIndex);

    useEffect(() => {
        setCurrentSnapIndex((prev) => Math.min(prev, detents.length - 1));
    }, [detents.length]);

    const isMax = currentSnapIndex === detents.length - 1;

    const safeSnapIndex = Math.min(currentSnapIndex, detents.length - 1);
    const activeDetent = detents[safeSnapIndex] ?? detents[0];
    const sheetHeight = myResolveDetentHeight({
        detent: activeDetent,
        windowHeight,
    });

    const dragY = useMotionValue(0);

    const sheetContainerRef = useRef<HTMLDivElement>(null);
    const scrollContentRef = useRef<HTMLDivElement>(null);
    const activeScrollNodeRef = useRef<HTMLElement | null>(null);

    const touchStartY = useRef(0);
    const touchStartX = useRef(0);
    const initialScrollTop = useRef(0);
    const lastTouchY = useRef(0);
    const lastTouchTime = useRef(0);
    const touchVelocityY = useRef(0);
    const isDraggingSheet = useRef(false);
    const lastDeltaYRef = useRef(0);

    const handleDismissOrSnap = useCallback(() => {
        const currentDragY = dragY.get();
        const rawDeltaY = lastDeltaYRef.current;
        const velocityY = touchVelocityY.current;

        const isLowestDetent = currentSnapIndex === 0;
        const isHighestDetent = isMax;

        if (rawDeltaY > 0) {
            // Движение вниз
            if (isLowestDetent) {
                // Закрытие на минимальном детенте:
                // Либо уверенная протяжка вниз с учетом сопротивления, либо четкий свайп (флик)
                const dismissThreshold = Math.min(sheetHeight * 0.35, 170);
                const isPulledDownFar = currentDragY >= 75 || rawDeltaY >= dismissThreshold;
                const isFlingDown = velocityY > 550 && rawDeltaY > 40;

                if (isPulledDownFar || isFlingDown) {
                    animate(dragY, sheetHeight + 80, {
                        type: 'spring',
                        damping: 32,
                        stiffness: 260,
                        mass: 0.9,
                        onComplete: () => {
                            item.onDismiss();
                        },
                    });
                    return;
                }
            } else {
                // Переход на более низкий детент
                const lowerDetent = detents[currentSnapIndex - 1];
                const lowerHeight = myResolveDetentHeight({ detent: lowerDetent, windowHeight });
                const stepDistance = sheetHeight - lowerHeight;
                const stepThreshold = Math.min(stepDistance * 0.4, 70);
                const isFlingDown = velocityY > 450;

                if (currentDragY > stepThreshold || isFlingDown) {
                    animate(dragY, 0, { type: 'spring', damping: 28, stiffness: 340 });
                    setCurrentSnapIndex((prev) => Math.max(0, prev - 1));
                    return;
                }
            }
        } else if (rawDeltaY < 0 && !isHighestDetent) {
            // Движение вверх к более высокому детенту
            const nextDetent = detents[currentSnapIndex + 1];
            const nextHeight = myResolveDetentHeight({ detent: nextDetent, windowHeight });
            const stepDistance = nextHeight - sheetHeight;
            const stepThreshold = Math.min(stepDistance * 0.4, 60);
            const isFlingUp = velocityY < -450;

            if (Math.abs(currentDragY) > stepThreshold || isFlingUp) {
                animate(dragY, 0, { type: 'spring', damping: 28, stiffness: 340 });
                setCurrentSnapIndex((prev) => Math.min(detents.length - 1, prev + 1));
                return;
            }
        }

        // Пружинный возврат на текущий уровень детента (iOS Spring)
        animate(dragY, 0, { type: 'spring', damping: 28, stiffness: 360, mass: 0.8 });
    }, [dragY, sheetHeight, currentSnapIndex, isMax, detents, windowHeight, item]);

    useEffect(() => {
        const sheetNode = sheetContainerRef.current;
        if (!sheetNode) return;

        const onTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            touchStartY.current = touch.clientY;
            touchStartX.current = touch.clientX;
            lastTouchY.current = touch.clientY;
            lastTouchTime.current = performance.now();
            touchVelocityY.current = 0;
            isDraggingSheet.current = false;
            lastDeltaYRef.current = 0;

            // Находим реальный скроллируемый элемент под пальцем
            const scrollEl = getScrollableParent(e.target as HTMLElement | null, sheetContainerRef.current);
            activeScrollNodeRef.current = scrollEl;
            initialScrollTop.current = scrollEl ? scrollEl.scrollTop : 0;
        };

        const onTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            const currentY = touch.clientY;
            const currentX = touch.clientX;
            const deltaY = currentY - touchStartY.current;
            const deltaX = Math.abs(currentX - touchStartX.current);

            const now = performance.now();
            const dt = now - lastTouchTime.current;
            if (dt > 0) {
                touchVelocityY.current = ((currentY - lastTouchY.current) / dt) * 1000;
            }
            lastTouchY.current = currentY;
            lastTouchTime.current = now;

            // Горизонтальные свайпы внутри модалки не перехватываем
            if (!isDraggingSheet.current && deltaX > Math.abs(deltaY)) {
                return;
            }

            const scrollEl = activeScrollNodeRef.current;
            const currentScroll = scrollEl ? scrollEl.scrollTop : 0;

            // Если палец опустился на уже проскролленный контент или контент еще скроллится — не перехватываем жест
            if (!isDraggingSheet.current) {
                if (initialScrollTop.current > 0 || currentScroll > 0) {
                    return;
                }

                if (!isMax) {
                    if (Math.abs(deltaY) > 6) {
                        isDraggingSheet.current = true;
                    }
                } else {
                    // На максимальном детенте тянуть вниз можно только если скролл находится строго в верхней точке (<= 0)
                    if (initialScrollTop.current <= 0 && currentScroll <= 0 && deltaY > 6) {
                        isDraggingSheet.current = true;
                    }
                }
            }

            if (isDraggingSheet.current) {
                if (e.cancelable) {
                    e.preventDefault();
                }
                e.stopPropagation();

                lastDeltaYRef.current = deltaY;

                if (deltaY > 0) {
                    // Тянем вниз
                    if (currentSnapIndex === 0) {
                        // Минимальный уровень: эластичное сопротивление (Rubber Band)
                        const damped = rubberBand(deltaY, sheetHeight, 0.55);
                        dragY.set(damped);
                    } else {
                        // Есть нижний уровень: свободный ход до нижнего детента, далее сопротивление
                        const lowerDetent = detents[currentSnapIndex - 1];
                        const lowerHeight = myResolveDetentHeight({ detent: lowerDetent, windowHeight });
                        const maxTravel = Math.max(1, sheetHeight - lowerHeight);

                        if (deltaY <= maxTravel) {
                            dragY.set(deltaY);
                        } else {
                            const excess = deltaY - maxTravel;
                            const dampedExcess = rubberBand(excess, lowerHeight, 0.55);
                            dragY.set(maxTravel + dampedExcess);
                        }
                    }
                } else {
                    // Тянем вверх (deltaY < 0)
                    const pullUp = -deltaY;
                    if (isMax) {
                        // Максимальный уровень: сопротивление оттягиванию вверх
                        const damped = -rubberBand(pullUp, sheetHeight, 0.25);
                        dragY.set(damped);
                    } else {
                        // Есть более высокий уровень: свободный ход до следующего детента, далее сопротивление
                        const nextDetent = detents[currentSnapIndex + 1];
                        const nextHeight = myResolveDetentHeight({ detent: nextDetent, windowHeight });
                        const maxTravel = Math.max(1, nextHeight - sheetHeight);

                        if (pullUp <= maxTravel) {
                            dragY.set(deltaY);
                        } else {
                            const excess = pullUp - maxTravel;
                            const dampedExcess = rubberBand(excess, sheetHeight, 0.25);
                            dragY.set(-(maxTravel + dampedExcess));
                        }
                    }
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (isDraggingSheet.current) {
                e.stopPropagation();
                handleDismissOrSnap();
            }
            isDraggingSheet.current = false;
            activeScrollNodeRef.current = null;
        };

        sheetNode.addEventListener('touchstart', onTouchStart, { passive: true });
        sheetNode.addEventListener('touchmove', onTouchMove, { passive: false });
        sheetNode.addEventListener('touchend', onTouchEnd, { passive: true });
        sheetNode.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            sheetNode.removeEventListener('touchstart', onTouchStart);
            sheetNode.removeEventListener('touchmove', onTouchMove);
            sheetNode.removeEventListener('touchend', onTouchEnd);
            sheetNode.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isMax, currentSnapIndex, sheetHeight, detents, windowHeight, handleDismissOrSnap, dragY]);

    const borderRadius = myGetDefaultCornerRadius();
    const paddingStyle = myGetDefaultSheetPadding().toStyle({ property: 'padding' });

    return (
        <>
            {/* Затемняющий оверлей */}
            <motion.div
                key={`overlay-${item.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={item.onDismiss}
                onTouchMove={(e) => {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                }}
                onWheel={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                className="absolute inset-0 z-60 bg-black/60 backdrop-blur-sm pointer-events-auto touch-none"
            />

            {/* Контейнер модалки с жестовым смещением dragY */}
            <motion.div
                ref={sheetContainerRef}
                key={`sheet-${item.id}`}
                layoutId={item.sourceId}
                initial={item.sourceId ? undefined : { scale: 0.85, opacity: 0, y: 40 }}
                animate={item.sourceId ? { height: sheetHeight } : { scale: 1, opacity: 1, y: 0, height: sheetHeight }}
                exit={item.sourceId ? undefined : { scale: 0.9, opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280, mass: 0.8 }}
                onPointerDown={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                style={{
                    y: dragY,
                    touchAction: isMax ? 'pan-y' : 'none',
                    ...paddingStyle,
                }}
                className="absolute bottom-0 left-0 right-0 z-61 flex flex-col pointer-events-auto"
            >
                <div
                    ref={scrollContentRef}
                    className="w-full h-full scrollbar-none"
                    style={{
                        overflowY: isMax ? 'auto' : 'hidden',
                        overflowX: 'hidden',
                        overscrollBehaviorY: 'contain',
                        borderRadius: `${borderRadius}px`,
                        transform: 'translateZ(0)',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {item.content}
                </div>
            </motion.div>
        </>
    );
};