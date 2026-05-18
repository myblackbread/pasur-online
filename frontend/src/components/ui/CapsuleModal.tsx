"use client";

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, useMotionValue, animate } from 'framer-motion';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';

interface CapsuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    layoutId: string;
    headerLeft: React.ReactNode;
    children: React.ReactNode;
    portalNode?: HTMLElement | null;
}

export function CapsuleModal({
    isOpen,
    onClose,
    layoutId,
    headerLeft,
    children,
    portalNode
}: CapsuleModalProps) {
    const dragControls = useDragControls();
    const y = useMotionValue(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Сбрасываем позицию при открытии
    useEffect(() => {
        if (isOpen) y.set(0);
    }, [isOpen, y]);

    // Логика умного свайпа вниз (Pull-to-close)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !isOpen) return;

        let startY = 0;
        let lastY = 0;
        let isPulling = false;
        let pullStartY = 0;
        let lastTime = 0;
        let velocity = 0;

        const handleStart = (clientY: number) => {
            startY = clientY;
            lastY = startY;
            lastTime = performance.now();
            velocity = 0;

            if (el.scrollTop <= 1) {
                isPulling = true;
                pullStartY = startY;
            } else {
                isPulling = false;
            }
        };

        const handleMove = (clientY: number, e: Event) => {
            const dy = clientY - lastY;
            const now = performance.now();
            const dt = now - lastTime;

            if (dt > 0) velocity = dy / (dt / 1000);

            lastY = clientY;
            lastTime = now;

            if (el.scrollTop <= 1 && dy > 0 && !isPulling) {
                isPulling = true;
                pullStartY = clientY;
            }

            if (isPulling) {
                const pullDistance = clientY - pullStartY;
                if (pullDistance > 0) {
                    y.set(pullDistance * 0.8);
                    if (e.cancelable) e.preventDefault();
                } else {
                    isPulling = false;
                    y.set(0);
                }
            }
        };

        const handleEnd = () => {
            if (isPulling) {
                if (y.get() > 120 || velocity > 400) {
                    onClose();
                } else {
                    animate(y, 0, { type: "spring", stiffness: 350, damping: 35 });
                }
            }
            isPulling = false;
        };

        const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientY);
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY, e);

        let isMouseDown = false;
        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            isMouseDown = true;
            handleStart(e.clientY);
        };
        const onMouseMove = (e: MouseEvent) => {
            if (!isMouseDown) return;
            handleMove(e.clientY, e);
        };
        const onMouseUp = () => {
            if (!isMouseDown) return;
            isMouseDown = false;
            handleEnd();
        };

        let wheelTimeout: NodeJS.Timeout;
        const onWheel = (e: WheelEvent) => {
            if (el.scrollTop <= 1 && e.deltaY < 0) {
                const currentY = y.get();
                const pullAmount = -e.deltaY * 0.8;
                const newY = currentY + pullAmount;

                if (newY > 0) {
                    y.set(newY);
                    if (e.cancelable) e.preventDefault();
                }

                clearTimeout(wheelTimeout);
                wheelTimeout = setTimeout(() => {
                    if (y.get() > 120) {
                        onClose();
                    } else if (y.get() > 0) {
                        animate(y, 0, { type: "spring", stiffness: 350, damping: 35 });
                    }
                }, 150);
            } else if (y.get() > 0 && e.deltaY > 0) {
                const currentY = y.get();
                const pullAmount = -e.deltaY * 0.8;
                const newY = Math.max(0, currentY + pullAmount);
                y.set(newY);
                if (e.cancelable) e.preventDefault();
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', handleEnd, { passive: true });
        el.addEventListener('touchcancel', handleEnd, { passive: true });

        el.addEventListener('mousedown', onMouseDown, { passive: true });
        window.addEventListener('mousemove', onMouseMove, { passive: false });
        window.addEventListener('mouseup', onMouseUp, { passive: true });

        el.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', handleEnd);
            el.removeEventListener('touchcancel', handleEnd);

            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            el.removeEventListener('wheel', onWheel);
            clearTimeout(wheelTimeout);
        };
    }, [isOpen, y, onClose]);

    const content = (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        style={{ zIndex: 60 }}
                        onClick={onClose}
                    />

                    <MorphingCapsule
                        isCapsule={false}
                        targetRadius={32}
                        layoutId={layoutId}
                        transition={sharedSpringTransition}
                        style={{ y, zIndex: 70 }}
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.8 }}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 120 || info.velocity.y > 400) onClose();
                        }}
                        className="absolute inset-2 sm:inset-4 flex flex-col pointer-events-auto shadow-2xl bg-theme-panel"
                    >
                        <div className="relative z-10 w-full h-full text-theme-text overflow-hidden rounded-[inherit]">
                            
                            {/* Скроллируемый контент (теперь он на весь экран и заезжает под шапку) */}
                            <motion.div
                                ref={scrollRef}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3, ease: 'easeOut' } }}
                                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                                className="absolute inset-0 overflow-y-auto overscroll-none pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            >
                                <div className="h-20 sm:h-24 w-full shrink-0" /> {/* Спейсер для шапки */}
                                <div className="px-4 sm:px-6">
                                    {children}
                                </div>
                            </motion.div>

                            {/* ПАРЯЩАЯ ШАПКА (с градиентом) */}
                            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
                                {/* Градиент для плавного растворения контента */}
                                <div className="absolute inset-0 bg-gradient-to-b from-theme-panel via-theme-panel/90 to-transparent h-28 -z-10" />
                                
                                <div
                                    className="pt-4 pb-2 px-4 sm:px-6 flex items-center relative pointer-events-auto touch-none cursor-grab active:cursor-grabbing"
                                    onPointerDown={(e) => {
                                        // Разрешаем кликать по кнопкам и вводу внутри шапки
                                        const target = e.target as HTMLElement;
                                        if (target.closest('button') || target.closest('input')) return;
                                        dragControls.start(e);
                                    }}
                                >
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-theme-text/20 rounded-full pointer-events-none" />
                                    <div className="flex-1 flex items-center gap-3">
                                        {headerLeft}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </MorphingCapsule>
                </>
            )}
        </AnimatePresence>
    );

    if (portalNode) {
        return createPortal(content, portalNode);
    }
    return content;
}