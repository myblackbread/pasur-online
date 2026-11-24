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

    // Динамический расчет границ затухания вместо жестких 30px
    const fadeOffset = spacing * 0.3; 
    const opacity = useTransform(
        x, 
        [-spacing - fadeOffset, -spacing, 0, spacing, spacing + fadeOffset], 
        [0, 0.4, 1, 0.4, 0]
    );
    
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
    items,
    activeIndex,
    onChange,
    onCenterClick,
    children,
    itemWidth = 100,
    gap = 16,
    className = ''
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
                    key={i}
                    item={item}
                    index={i}
                    dragX={dragX}
                    isDraggingVal={isDraggingVal}
                    isDraggingRef={isDraggingRef}
                    updateActiveIndex={updateActiveIndex}
                    onCenterClick={onCenterClick}
                    itemWidth={itemWidth}
                    spacing={spacing}
                    totalLength={totalLength}
                    isActive={activeIndex === i}
                >
                    {children}
                </InfiniteCarouselItem>
            ))}
        </motion.div>
    );
}

// import React, { useRef, useEffect, createContext, useContext } from 'react';
// import { motion, useMotionValue, useTransform, animate, PanInfo, MotionValue } from 'framer-motion';

// // 1. Выносим магические числа (SwiftUI-style modifiers)
// const SPRING_CONFIG = { type: 'spring', stiffness: 300, damping: 30 };
// const SWIPE_VELOCITY_THRESHOLD = 300;

// // 2. Создаем Context (аналог @Environment) для избавления от Prop Drilling
// interface CarouselContextType {
//     dragX: MotionValue<number>;
//     isPressing: MotionValue<number>;
//     isDragging: React.MutableRefObject<boolean>;
//     spacing: number;
//     totalLength: number;
//     itemWidth: number;
//     updateActiveIndex: (targetX: number) => void;
//     onCenterClick?: () => void;
// }

// const CarouselContext = createContext<CarouselContextType | null>(null);

// const useCarousel = () => {
//     const ctx = useContext(CarouselContext);
//     if (!ctx) throw new Error("useCarousel must be used within InfiniteCarousel");
//     return ctx;
// };

// // ==========================================
// // ITEM COMPONENT
// // ==========================================

// export interface InfiniteCarouselItemProps<T> {
//     item: T;
//     index: number;
//     isActive: boolean;
//     children: (item: T, isActive: boolean) => React.ReactNode;
// }

// function InfiniteCarouselItem<T>({ item, index, isActive, children }: InfiniteCarouselItemProps<T>) {
//     // Вся магия берется из контекста — никаких длинных списков пропсов!
//     const { dragX, isPressing, isDragging, spacing, totalLength, itemWidth, updateActiveIndex, onCenterClick } = useCarousel();

//     // Бесконечная математика: зацикливаем координаты
//     const x = useTransform(dragX, (v) => {
//         const rawX = v + index * spacing;
//         const halfTotal = totalLength / 2;
//         return ((((rawX + halfTotal) % totalLength) + totalLength) % totalLength) - halfTotal;
//     });

//     // Анимация масштаба
//     const scale = useTransform(() => {
//         if (isPressing.get() === 1) return 0.9; // Сжатие при тапе
//         const distance = Math.abs(x.get());
//         if (distance >= 20) return 0.9;
//         return 1.1 - (0.2 * (distance / 20)); // Плавно от 1.1 к 0.9
//     });

//     // Анимация прозрачности
//     const fadeOffset = spacing * 0.3;
//     const opacity = useTransform(
//         x, 
//         [-spacing - fadeOffset, -spacing, 0, spacing, spacing + fadeOffset], 
//         [0, 0.4, 1, 0.4, 0]
//     );
    
//     const zIndex = useTransform(x, [-spacing, 0, spacing], [5, 10, 5]);

//     const handleClick = () => {
//         if (isDragging.current) return; // Блокируем клик, если это был свайп
        
//         const currentX = x.get();
//         if (Math.abs(currentX) > 10) {
//             // Кликнули по боковому элементу -> центрируем его
//             const targetDragX = dragX.get() - currentX;
//             animate(dragX, targetDragX, SPRING_CONFIG);
//             updateActiveIndex(targetDragX);
//         } else {
//             // Кликнули прямо по центру
//             onCenterClick?.();
//         }
//     };

//     return (
//         <motion.div
//             style={{ x, scale, opacity, zIndex, width: itemWidth }}
//             onClick={handleClick}
//             className="absolute flex items-center justify-center cursor-pointer"
//         >
//             {children(item, isActive)}
//         </motion.div>
//     );
// }

// // ==========================================
// // MAIN CAROUSEL COMPONENT
// // ==========================================

// export interface InfiniteCarouselProps<T> {
//     items: T[];
//     activeIndex: number;
//     onChange: (index: number) => void;
//     onCenterClick?: () => void;
//     children: (item: T, isActive: boolean) => React.ReactNode;
//     itemWidth?: number;
//     gap?: number;
//     className?: string;
// }

// export function InfiniteCarousel<T>({ 
//     items, activeIndex, onChange, onCenterClick, children,
//     itemWidth = 100, gap = 16, className = ''
// }: InfiniteCarouselProps<T>) {
//     const dragX = useMotionValue(0);
//     const isPressing = useMotionValue(0); // Переименовали isDraggingVal -> isPressing для понятности
//     const isDragging = useRef(false);
//     const panStartX = useRef(0);

//     const n = items.length;
//     const spacing = itemWidth + gap;
//     const totalLength = n * spacing;

//     const updateActiveIndex = (targetX: number) => {
//         const newIndex = ((Math.round(-targetX / spacing) % n) + n) % n;
//         onChange(newIndex);
//     };

//     // Синхронизация activeIndex снаружи -> внутрь (крутим по кратчайшему пути)
//     useEffect(() => {
//         const currentTarget = Math.round(-dragX.get() / spacing);
//         const normalizedTarget = ((currentTarget % n) + n) % n;
        
//         if (normalizedTarget !== activeIndex && !isDragging.current) {
//             const diff = (activeIndex - normalizedTarget + n) % n;
//             const shift = diff > n / 2 ? diff - n : diff;
//             animate(dragX, -(currentTarget + shift) * spacing, SPRING_CONFIG);
//         }
//     }, [activeIndex, n, spacing, dragX]);

//     // Жесты
//     const handlePanStart = () => {
//         isDragging.current = true;
//         panStartX.current = dragX.get();
//     };

//     const handlePan = (_: Event, info: PanInfo) => { 
//         dragX.set(panStartX.current + info.offset.x); 
//     };

//     const handlePanEnd = (_: Event, info: PanInfo) => {
//         isPressing.set(0);
//         setTimeout(() => { isDragging.current = false; }, 50); // Задержка от ложных кликов

//         const currentX = dragX.get();
//         const velocity = info.velocity.x;
        
//         let targetX = Math.round(currentX / spacing) * spacing;
        
//         // Инерция при резком свайпе
//         if (velocity < -SWIPE_VELOCITY_THRESHOLD) targetX = Math.floor(currentX / spacing) * spacing;
//         else if (velocity > SWIPE_VELOCITY_THRESHOLD) targetX = Math.ceil(currentX / spacing) * spacing;

//         animate(dragX, targetX, SPRING_CONFIG);
//         updateActiveIndex(targetX);
//     };

//     return (
//         <CarouselContext.Provider value={{ 
//             dragX, isPressing, isDragging, spacing, totalLength, itemWidth, updateActiveIndex, onCenterClick 
//         }}>
//             <motion.div
//                 onPointerDown={() => isPressing.set(1)}
//                 onPointerUp={() => isPressing.set(0)}
//                 onPointerCancel={() => isPressing.set(0)}
//                 onPanStart={handlePanStart}
//                 onPan={handlePan}
//                 onPanEnd={handlePanEnd}
//                 className={`relative flex items-center justify-center touch-none cursor-grab active:cursor-grabbing ${className}`}
//                 style={{
//                     WebkitMaskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent)',
//                     maskImage: 'linear-gradient(to right, transparent, black 25%, black 75%, transparent)'
//                 }}
//             >
//                 {items.map((item, i) => (
//                     <InfiniteCarouselItem
//                         key={i}
//                         item={item}
//                         index={i}
//                         isActive={activeIndex === i}
//                     >
//                         {children}
//                     </InfiniteCarouselItem>
//                 ))}
//             </motion.div>
//         </CarouselContext.Provider>
//     );
// }