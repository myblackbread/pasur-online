import React, { useState, useRef } from 'react';
import { motion, useMotionValue, animate, useTransform } from 'framer-motion';

interface SwipeableActionCardProps {
    children: React.ReactNode;                     // Любой контент карточки
    actionContent: React.ReactNode;                // Иконка/текст подложки
    onAction: (resetCard: () => void) => void;     // Коллбэк при свайпе/клике
    onClick?: () => void;                          // Коллбэк при обычном клике по карточке
    actionBgColor?: string;                        // Цвет подложки (Tailwind класс)
    isActionLoading?: boolean;                     // Блокировка действия
}

export const SwipeableActionCard = ({
    children,
    actionContent,
    onAction,
    onClick,
    actionBgColor = 'bg-red-500',
    isActionLoading = false
}: SwipeableActionCardProps) => {
    const x = useMotionValue(0);
    const [isOpen, setIsOpen] = useState(false);
    const isDragging = useRef(false);

    // --- Константы математики свайпа ---
    const SPACER = 10;
    const CAPSULE_WIDTH = 90;
    const STAGE_1_X = CAPSULE_WIDTH + SPACER;

    const resetCard = () => {
        setIsOpen(false);
        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    };

    const handleDragStart = () => {
        isDragging.current = true;
    };

    const handleDragEnd = (e: any, info: any) => {
        setTimeout(() => { isDragging.current = false; }, 50);

        const autoTriggerThreshold = -160; 

        if (info.offset.x < autoTriggerThreshold || info.velocity.x < -800) {
            setIsOpen(true);
            animate(x, -STAGE_1_X, { type: "spring", stiffness: 300, damping: 30 });
            onAction(resetCard);
        } else if (info.offset.x < -(STAGE_1_X - 20)) {
            setIsOpen(true);
            animate(x, -STAGE_1_X, { type: "spring", stiffness: 300, damping: 30 });
        } else {
            resetCard();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging.current) {
            e.preventDefault();
            return;
        }
        if (isOpen) {
            e.preventDefault();
            resetCard();
            return;
        }
        onClick?.();
    };

    // --- Анимации ---
    const capsuleScale = useTransform(x, (v) => {
        const absX = Math.max(0, -v);
        if (absX <= SPACER) return 0; 
        if (absX < STAGE_1_X) return (absX - SPACER) / CAPSULE_WIDTH; 
        return 1; 
    });

    const capsuleWidth = useTransform(x, (v) => {
        const absX = Math.max(0, -v);
        if (absX < STAGE_1_X) return CAPSULE_WIDTH;
        return absX - SPACER; 
    });

    return (
        <div className="relative w-full mb-3 sm:mb-4">
            {/* Подложка */}
            <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end z-0">
                <motion.div 
                    style={{ width: capsuleWidth, scale: capsuleScale, originX: 1, originY: 0.5 }}
                    className={`${actionBgColor} rounded-full h-full flex flex-col items-center justify-center font-bold text-white cursor-pointer transition-colors shadow-sm overflow-hidden`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isActionLoading) {
                            animate(x, -STAGE_1_X, { type: "spring", stiffness: 300, damping: 30 });
                            onAction(resetCard);
                        }
                    }}
                >
                    {actionContent}
                </motion.div>
            </div>

            {/* Контейнер карточки */}
            <motion.div
                style={{ x }}
                drag="x"
                dragConstraints={{ right: 0 }}
                dragElastic={{ left: 0.4, right: 0 }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                className="relative z-10 w-full touch-pan-y"
            >
                {children}
            </motion.div>
        </div>
    );
};