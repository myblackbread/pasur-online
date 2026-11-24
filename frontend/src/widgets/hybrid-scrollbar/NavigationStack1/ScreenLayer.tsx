import React, { useEffect, useRef, useContext } from 'react';
import { motion, type Transition } from 'framer-motion';
import { PopOptionsContext } from './NavigationContext';
import type { TransitionOptions, NavigationTransitionType } from './types';

const stackSpring: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 };
const instantTransition: Transition = { duration: 0 };

interface ScreenLayerProps {
    isActive: boolean;
    zIndex: number;
    isRoot: boolean;
    isActionAnimated: boolean;
    globalAnimatePop: boolean;
    transitionType: NavigationTransitionType;
    cornerRadius: number;
    children: React.ReactNode;
}

export const ScreenLayer: React.FC<ScreenLayerProps> = ({
    isActive,
    zIndex,
    isRoot,
    isActionAnimated,
    globalAnimatePop,
    transitionType,
    cornerRadius,
    children,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const popOptionsRef = useContext(PopOptionsContext);

    // Откладываем фокус, чтобы браузер не пытался проскроллить 
    // страницу к элементу, который еще находится за пределами экрана
    useEffect(() => {
        if (isActive && containerRef.current) {
            const timer = setTimeout(() => {
                containerRef.current?.focus();
            }, 400); 
            return () => clearTimeout(timer);
        }
    }, [isActive]);

    const currentTransition = isActionAnimated ? stackSpring : instantTransition;
    
    // Формируем строку с пикселями для безопасной анимации
    const radiusPx = `${cornerRadius}px`;

    // 1. Стандартная анимация с масштабированием
    const scaleVariants = {
        initial: { 
            scale: 1.08, 
            opacity: 0, 
            borderBottomLeftRadius: radiusPx, 
            borderBottomRightRadius: radiusPx 
        },
        active: { 
            scale: 1, 
            opacity: 1, 
            // Во время анимации держим скругления
            borderBottomLeftRadius: radiusPx, 
            borderBottomRightRadius: radiusPx,
            visibility: 'visible' as const,
            contentVisibility: 'visible' as const,
            transitionEnd: {
                // Мгновенно отключаем скругления после завершения анимации
                borderBottomLeftRadius: '0px', 
                borderBottomRightRadius: '0px',
            },
            transition: currentTransition 
        },
        inactive: { 
            scale: 0.92, 
            opacity: 0, 
            borderBottomLeftRadius: radiusPx, 
            borderBottomRightRadius: radiusPx, // Возвращаем радиус при уходе назад
            transitionEnd: { 
                // Выключаем рендер нижних слоев только после того, как они скрылись
                visibility: 'hidden' as const,
                contentVisibility: 'hidden' as const
            },
            transition: currentTransition 
        },
        exit: (customPopOptionsRef?: React.MutableRefObject<TransitionOptions | undefined>) => {
            const isPopAnimated = customPopOptionsRef?.current?.animated ?? globalAnimatePop;
            return {
                scale: 1.08, 
                opacity: 0,
                borderBottomLeftRadius: radiusPx, 
                borderBottomRightRadius: radiusPx,
                transition: isPopAnimated ? stackSpring : instantTransition,
            };
        },
    };

    // 2. iOS-подобная анимация наложения (Slide)
    const slideVariants = {
        initial: { 
            x: '100%', 
            opacity: 1, 
            borderBottomLeftRadius: radiusPx, 
            borderBottomRightRadius: radiusPx 
        },
        active: { 
            x: '0%', 
            opacity: 1, 
            filter: 'brightness(1)',
            // Во время анимации держим скругления
            borderBottomLeftRadius: radiusPx, 
            borderBottomRightRadius: radiusPx,
            visibility: 'visible' as const,
            contentVisibility: 'visible' as const,
            transitionEnd: {
                // Мгновенно отключаем скругления после завершения анимации
                borderBottomLeftRadius: '0px', 
                borderBottomRightRadius: '0px',
            },
            transition: currentTransition 
        },
        inactive: { 
            x: '-30%', 
            opacity: 0.8, 
            filter: 'brightness(0.6)', 
            borderBottomLeftRadius: radiusPx, 
            borderBottomRightRadius: radiusPx,
            transitionEnd: { 
                // Выключаем рендер нижних слоев только после того, как они скрылись
                visibility: 'hidden' as const,
                contentVisibility: 'hidden' as const
            },
            transition: currentTransition 
        },
        exit: (customPopOptionsRef?: React.MutableRefObject<TransitionOptions | undefined>) => {
            const isPopAnimated = customPopOptionsRef?.current?.animated ?? globalAnimatePop;
            return {
                x: '100%', 
                opacity: 1, 
                filter: 'brightness(1)',
                borderBottomLeftRadius: radiusPx, 
                borderBottomRightRadius: radiusPx,
                transition: isPopAnimated ? stackSpring : instantTransition,
            };
        },
    };

    const variants = transitionType === 'slide' ? slideVariants : scaleVariants;

    return (
        <motion.div
            ref={containerRef}
            inert={!isActive ? true : undefined}
            tabIndex={-1}
            variants={variants}
            initial={isRoot ? false : 'initial'}
            animate={isActive ? 'active' : 'inactive'}
            exit="exit"
            custom={popOptionsRef} 
            aria-hidden={!isActive}
            data-scroller={isActive ? 'true' : undefined}
            className="absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden outline-none [&::-webkit-scrollbar]:hidden bg-background"
            style={{
                zIndex,
                WebkitOverflowScrolling: 'touch',
                // Убрано невалидное свойство border-radius
                willChange: 'transform, opacity, filter', 
                boxShadow: transitionType === 'slide' && !isRoot 
                    ? '-10px 0 30px rgba(0,0,0,0.15)' 
                    : undefined
            }}
        >
            {children}
        </motion.div>
    );
};