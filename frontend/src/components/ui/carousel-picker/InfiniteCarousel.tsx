import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo, MotionValue } from 'framer-motion';

export interface InfiniteCarouselItemProps<T> {
    item: T;
    index: number;
    dragX: MotionValue<number>;
    isDraggingVal: MotionValue<number>;
    isDraggingRef: React.MutableRefObject<boolean>;
    updateActiveIndex: (targetX: number) => void;
    onCenterClick?: () => void;
    itemWidth: number;
    spacing: number;
    totalLength: number;
    isActive: boolean;
    children: (item: T, isActive: boolean) => React.ReactNode;
}

function InfiniteCarouselItem<T>({
    item, index, dragX, isDraggingVal, isDraggingRef, updateActiveIndex, onCenterClick,
    itemWidth, spacing, totalLength, isActive, children
}: InfiniteCarouselItemProps<T>) {
    
    const x = useTransform(dragX, (v) => {
        const rawX = v + index * spacing;
        return ((((rawX + totalLength / 2) % totalLength) + totalLength) % totalLength) - totalLength / 2;
    });

    const scale = useTransform(() => {
        if (isDraggingVal.get() === 1) return 0.9;
        const currentX = x.get();
        const distance = Math.abs(currentX);
        if (distance >= 20) return 0.9;
        return 1.1 - (0.2 * (distance / 20));
    });

    const opacity = useTransform(x, [-spacing - 30, -spacing, 0, spacing, spacing + 30], [0, 0.4, 1, 0.4, 0]);
    const zIndex = useTransform(x, [-spacing, 0, spacing], [5, 10, 5]);

    const handleClick = () => {
        if (isDraggingRef.current) return;
        const currentX = x.get();
        
        if (Math.abs(currentX) > 10) {
            const targetDragX = dragX.get() - currentX;
            animate(dragX, targetDragX, { type: 'spring', stiffness: 300, damping: 30 });
            updateActiveIndex(targetDragX);
        } else {
            if (onCenterClick) onCenterClick();
        }
    };

    return (
        <motion.div
            style={{ x, scale, opacity, zIndex, width: itemWidth }}
            onClick={handleClick}
            className="absolute flex items-center justify-center cursor-pointer"
        >
            {children(item, isActive)}
        </motion.div>
    );
}

export interface InfiniteCarouselProps<T> {
    items: T[];
    activeIndex: number;
    onChange: (index: number) => void;
    onCenterClick?: () => void;
    children: (item: T, isActive: boolean) => React.ReactNode;
    itemWidth?: number;
    gap?: number;
    className?: string;
}

export function InfiniteCarousel<T>({ 
    items, activeIndex, onChange, onCenterClick, children, 
    itemWidth = 100, gap = 16, className = '' 
}: InfiniteCarouselProps<T>) {
    const dragX = useMotionValue(0);
    const isDraggingVal = useMotionValue(0);
    const isDraggingRef = useRef(false);
    const panStartX = useRef(0);

    const n = items.length;
    const spacing = itemWidth + gap;
    const totalLength = n * spacing;

    const updateActiveIndex = (targetX: number) => {
        let newIndex = Math.round(-targetX / spacing) % n;
        newIndex = (newIndex + n) % n;
        onChange(newIndex);
    };

    useEffect(() => {
        const currentTarget = Math.round(-dragX.get() / spacing);
        const normalizedTarget = ((currentTarget % n) + n) % n;
        if (normalizedTarget !== activeIndex && !isDraggingRef.current) {
            const diff = (activeIndex - normalizedTarget + n) % n;
            const shift = diff > n / 2 ? diff - n : diff;
            animate(dragX, -(currentTarget + shift) * spacing, { type: 'spring', stiffness: 300, damping: 30 });
        }
    }, [activeIndex, n, spacing, dragX]);

    const handlePanStart = () => {
        isDraggingRef.current = true;
        panStartX.current = dragX.get();
    };

    const handlePan = (e: any, info: PanInfo) => { dragX.set(panStartX.current + info.offset.x); };

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

    return (
        <motion.div
            onPointerDown={() => isDraggingVal.set(1)}
            onPointerUp={() => isDraggingVal.set(0)}
            onPointerCancel={() => isDraggingVal.set(0)}
            onPanStart={handlePanStart}
            onPan={handlePan}
            onPanEnd={handlePanEnd}
            className={`relative flex items-center justify-center touch-none cursor-grab active:cursor-grabbing ${className}`}
            style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent)',
                maskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent)'
            }}
        >
            {items.map((item, i) => (
                <InfiniteCarouselItem
                    key={i} item={item} index={i} dragX={dragX} isDraggingVal={isDraggingVal}
                    isDraggingRef={isDraggingRef} updateActiveIndex={updateActiveIndex}
                    onCenterClick={onCenterClick}
                    itemWidth={itemWidth} spacing={spacing} totalLength={totalLength} isActive={activeIndex === i}
                >
                    {children}
                </InfiniteCarouselItem>
            ))}
        </motion.div>
    );
}