"use client";

import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo, MotionValue } from 'framer-motion';

export interface CarouselPickerProps<T> {
    items: T[];
    itemWidth: number;
    gap: number;
    activeIndex: number;
    onIndexChange: (index: number) => void;
    renderItem: (item: T, isActive: boolean) => React.ReactNode;
    containerHeight?: number;
    className?: string;
}

interface CarouselItemProps<T> {
    item: T;
    index: number;
    spacing: number;
    totalLength: number;
    dragX: MotionValue<number>;
    isDraggingVal: MotionValue<number>;
    isDraggingRef: React.MutableRefObject<boolean>;
    updateActiveIndex: (targetX: number) => void;
    renderItem: (item: T, isActive: boolean) => React.ReactNode;
    activeIndex: number;
}

const CarouselItem = <T,>({ item, index, spacing, totalLength, dragX, isDraggingVal, isDraggingRef, updateActiveIndex, renderItem, activeIndex }: CarouselItemProps<T>) => {
    // Бесконечный скролл
    const x = useTransform(dragX, (v) => {
        const rawX = v + index * spacing;
        return ((((rawX + totalLength / 2) % totalLength) + totalLength) % totalLength) - totalLength / 2;
    });

    // Физика масштабирования
    const scale = useTransform(() => {
        if (isDraggingVal.get() === 1) return 0.9;
        const currentX = x.get();
        const distance = Math.abs(currentX);
        if (distance >= 20) return 0.9;
        return 1.1 - (0.2 * (distance / 20));
    });

    // Физика прозрачности (строго 3 видимых)
    const opacity = useTransform(x, [-spacing - 30, -spacing, 0, spacing, spacing + 30], [0, 0.4, 1, 0.4, 0]);
    const zIndex = useTransform(x, [-spacing, 0, spacing], [5, 10, 5]);

    const handleClick = () => {
        if (isDraggingRef.current) return;
        const currentX = x.get();
        if (Math.abs(currentX) > 10) {
            const targetDragX = dragX.get() - currentX;
            animate(dragX, targetDragX, { type: 'spring', stiffness: 300, damping: 30 });
            updateActiveIndex(targetDragX);
        }
    };

    return (
        <motion.div
            style={{ x, scale, opacity, zIndex }}
            onClick={handleClick}
            className="absolute flex items-center justify-center pointer-events-auto"
        >
            {renderItem(item, index === activeIndex)}
        </motion.div>
    );
};

export function CarouselPicker<T>({ items, itemWidth, gap, activeIndex, onIndexChange, renderItem, containerHeight = 120, className = '' }: CarouselPickerProps<T>) {
    const spacing = itemWidth + gap;
    const n = items.length;
    const totalLength = n * spacing;

    const dragX = useMotionValue(-activeIndex * spacing);
    const isDraggingVal = useMotionValue(0);
    const isDraggingRef = useRef(false);
    const panStartX = useRef(0);

    // Синхронизация при внешнем изменении индекса
    useEffect(() => {
        animate(dragX, -activeIndex * spacing, { type: 'spring', stiffness: 300, damping: 30 });
    }, [activeIndex, spacing, dragX]);

    const updateActiveIndex = (targetX: number) => {
        let newIndex = Math.round(-targetX / spacing) % n;
        newIndex = (newIndex + n) % n;
        onIndexChange(newIndex);
    };

    const handlePanStart = () => {
        isDraggingRef.current = true;
        panStartX.current = dragX.get();
    };

    const handlePan = (e: any, info: PanInfo) => dragX.set(panStartX.current + info.offset.x);

    const handlePanEnd = (e: any, info: PanInfo) => {
        isDraggingVal.set(0);
        setTimeout(() => { isDraggingRef.current = false; }, 50);

        const currentX = dragX.get();
        const velocity = info.velocity.x;
        let targetX = Math.round(currentX / spacing) * spacing;
        
        if (velocity < -300) targetX = Math.floor(currentX / spacing) * spacing;
        else if (velocity > 300) targetX = Math.ceil(currentX / spacing) * spacing;

        animate(dragX, targetX, { type: 'spring', stiffness: 300, damping: 30 });
        updateActiveIndex(targetX);
    };

    // Защита: нужно минимум 3 элемента для корректного цикла. Если меньше - дублируем.
    const renderItems = n < 3 ? [...items, ...items, ...items].slice(0, Math.max(3, n * 3)) : items;
    const realN = renderItems.length;
    const realTotalLength = realN * spacing;

    return (
        <motion.div
            onPointerDown={() => isDraggingVal.set(1)}
            onPointerUp={() => isDraggingVal.set(0)}
            onPointerCancel={() => isDraggingVal.set(0)}
            onPanStart={handlePanStart}
            onPan={handlePan}
            onPanEnd={handlePanEnd}
            style={{ height: containerHeight }}
            className={`relative w-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing ${className}`}
        >
            {renderItems.map((item, i) => (
                <CarouselItem
                    key={i}
                    item={item}
                    index={i}
                    spacing={spacing}
                    totalLength={realTotalLength}
                    dragX={dragX}
                    isDraggingVal={isDraggingVal}
                    isDraggingRef={isDraggingRef}
                    updateActiveIndex={updateActiveIndex}
                    renderItem={renderItem}
                    activeIndex={activeIndex}
                />
            ))}
        </motion.div>
    );
}