'use client';

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// Единая физика для всех Shared Layout анимаций
export const sharedSpringTransition = {
    type: 'spring',
    stiffness: 350,
    damping: 35,
    mass: 1,
} as const;


// Защита от ошибок SSR в Next.js
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;


interface MorphingCapsuleProps extends HTMLMotionProps<"div"> {
    isCapsule?: boolean;
    targetRadius?: number; // Радиус в пикселях для развернутого состояния (по умолчанию 40px = 2.5rem)
}

export const MorphingCapsule = React.forwardRef<HTMLDivElement, MorphingCapsuleProps>(
    ({ isCapsule = false, targetRadius = 40, style, className, children, ...props }, forwardedRef) => {
        const internalRef = useRef<HTMLDivElement>(null);

        // По умолчанию ставим targetRadius, чтобы на сервере рендерилось корректно. 
        // На клиенте мгновенно подхватится нужный радиус.
        const [calculatedRadius, setCalculatedRadius] = useState<number>(targetRadius);

        useIsomorphicLayoutEffect(() => {
            if (!isCapsule) {
                setCalculatedRadius(targetRadius);
                return;
            }

            const node = internalRef.current;
            if (!node) return;

            // Вычисляем реальный радиус капсулы (максимально возможный круг или капсула без наслоения)
            const updateRadius = () => {
                const rect = node.getBoundingClientRect();
                const minDimension = Math.min(rect.width, rect.height);
                setCalculatedRadius(minDimension / 2);
            };

            // Считаем сразу до отрисовки
            updateRadius();

            // Следим за ресайзом (если капсула меняет размер от текста внутри)
            const observer = new ResizeObserver(() => updateRadius());
            observer.observe(node);

            return () => observer.disconnect();
        }, [isCapsule, targetRadius]);

        // Корректный проброс ref
        const setRefs = (node: HTMLDivElement) => {
            internalRef.current = node;
            if (typeof forwardedRef === 'function') forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
        };

        return (
            <motion.div
                ref={setRefs}
                // Передаем точный пиксельный радиус во Framer Motion
                style={{ ...style, borderRadius: calculatedRadius }}
                className={`overflow-hidden ${className || ''}`}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

MorphingCapsule.displayName = 'MorphingCapsule';