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

    // Фокусируем только дочерние экраны при переходе вглубь (!isRoot)
    // и строго с preventScroll: true, чтобы браузер не прокручивал внешние контейнеры
    useEffect(() => {
        if (isActive && !isRoot && containerRef.current) {
            const timer = setTimeout(() => {
                containerRef.current?.focus({ preventScroll: true });
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isActive, isRoot]);

    const currentTransition = isActionAnimated ? stackSpring : instantTransition;
    const radiusPx = `${cornerRadius}px`;

    // 1. Стандартная анимация со скейлом (Android / Desktop)
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
            borderBottomLeftRadius: radiusPx,
            borderBottomRightRadius: radiusPx,
            visibility: 'visible' as const,
            contentVisibility: 'visible' as const,
            transitionEnd: {
                borderBottomLeftRadius: '0px',
                borderBottomRightRadius: '0px',
            },
            transition: currentTransition
        },
        inactive: {
            scale: 0.92,
            opacity: 0,
            borderBottomLeftRadius: radiusPx,
            borderBottomRightRadius: radiusPx,
            transitionEnd: {
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

    // 2. iOS-подобная анимация наложения (Slide) БЕЗ GPU-фильтров
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
            borderBottomLeftRadius: radiusPx,
            borderBottomRightRadius: radiusPx,
            visibility: 'visible' as const,
            contentVisibility: 'visible' as const,
            transitionEnd: {
                borderBottomLeftRadius: '0px',
                borderBottomRightRadius: '0px',
            },
            transition: currentTransition
        },
        inactive: {
            x: '-25%',
            opacity: 0.6,
            borderBottomLeftRadius: radiusPx,
            borderBottomRightRadius: radiusPx,
            transitionEnd: {
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
            className="absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden outline-none [&::-webkit-scrollbar]:hidden"
            style={{
                zIndex,
                WebkitOverflowScrolling: 'touch',
                contain: 'paint',
                willChange: isRoot && isActive ? 'auto' : 'transform, opacity',
                boxShadow: transitionType === 'slide' && !isRoot
                    ? '-10px 0 30px rgba(0,0,0,0.4)'
                    : undefined
            }}
        >
            {children}
        </motion.div>
    );
};