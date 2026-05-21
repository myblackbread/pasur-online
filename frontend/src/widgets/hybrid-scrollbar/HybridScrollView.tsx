"use client";

import React, { useRef, useEffect, useCallback, ReactNode, memo } from 'react';

export interface ScrollScreen {
    id: string;
    icon: ReactNode;
    content: ReactNode;
    bgClass?: string;
}

interface HybridScrollViewProps {
    screens: ScrollScreen[];
    onSwipeBlocked?: () => void;
}

export const HybridScrollView = memo(({ screens = [], onSwipeBlocked }: HybridScrollViewProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbHitboxRef = useRef<HTMLDivElement>(null);
    const thumbVisualRef = useRef<HTMLDivElement>(null);
    const iconsContainerRef = useRef<HTMLDivElement>(null);

    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number | null>(null);

    const isDragging = useRef<boolean>(false);
    const isHoveringThumb = useRef<boolean>(false);
    const isScrolling = useRef<boolean>(false);
    
    const wasExpandedRef = useRef<boolean>(false);
    const slotHeightsRef = useRef<number[]>([]);

    const dragOffset = useRef<number>(0);
    const lastDragYRef = useRef<number>(0);
    
    const isHealedRef = useRef<boolean>(true);
    const distortionYRef = useRef<number>(0);
    const distortedIndexRef = useRef<number>(0);
    const distortionStartYRef = useRef<number>(0);
    
    const isVibratingRef = useRef<boolean>(false);

    const onSwipeBlockedRef = useRef(onSwipeBlocked);
    useEffect(() => {
        onSwipeBlockedRef.current = onSwipeBlocked;
    }, [onSwipeBlocked]);

    const updateScrollbar = useCallback(() => {
        if (!containerRef.current || !trackRef.current || !thumbHitboxRef.current || !thumbVisualRef.current || screens.length === 0) return;

        const C = containerRef.current.clientHeight;
        const P_top = containerRef.current.scrollTop;
        const trackHeight = trackRef.current.clientHeight;
        const N = screens.length;
        const P_max = Math.max(C * (N - 1), 1);
        const H = trackHeight / N;

        const safe_P_top = Math.max(0, Math.min(P_top, P_max));
        const parentIndex = Math.floor(safe_P_top / C);
        const remainder = safe_P_top % C;
        const localProgress = Math.max(0, Math.min(1, remainder / C));

        const children = Array.from(containerRef.current.children).filter(c => c.hasAttribute('data-screen-index'));
        let V_total = 0;
        const heights: number[] = [];
        const scrollTops: number[] = [];

        children.forEach(c => {
            const scroller = c.querySelector('[data-scroller="true"]') as HTMLElement || c;
            const h = scroller.scrollHeight;
            const s = scroller.scrollTop;
            heights.push(h);
            scrollTops.push(s);
            V_total += h;
        });

        let accumulatedHeight = 0;
        for (let i = 0; i < parentIndex; i++) {
            accumulatedHeight += heights[i];
        }

        const currentScrollTop = scrollTops[parentIndex] || 0;
        const V_top = accumulatedHeight + currentScrollTop + remainder;

        const collapsedThumbHeight = Math.max(16, (C / Math.max(V_total, 1)) * trackHeight);
        const V_max = Math.max(V_total - C, 1);
        const collapsedProgress = Math.max(0, Math.min(1, V_top / V_max));
        const collapsedThumbY = collapsedProgress * (trackHeight - collapsedThumbHeight);

        const expandedProgress = Math.max(0, Math.min(1, safe_P_top / P_max));
        const activeIndex = Math.round(expandedProgress * (N - 1));

        const isExpanded = isDragging.current || isHoveringThumb.current;
        const toleranceZone = H * 0.15; 

        if (slotHeightsRef.current.length !== N) {
            slotHeightsRef.current = new Array(N).fill(H);
        }

        if (isExpanded && !wasExpandedRef.current) {
            const currentCenterY = collapsedThumbY + (collapsedThumbHeight / 2);
            const Y_ideal = (safe_P_top / C) * H + H / 2;

            if (Math.abs(currentCenterY - Y_ideal) > toleranceZone) {
                isHealedRef.current = false;
                distortionYRef.current = currentCenterY;
                distortionStartYRef.current = currentCenterY; 
                distortedIndexRef.current = activeIndex;
            } else {
                isHealedRef.current = true;
                distortionYRef.current = Y_ideal;
            }
        }

        if (iconsContainerRef.current) {
            const iconWrappers = Array.from(iconsContainerRef.current.children) as HTMLElement[];

            if (isExpanded) {
                let slotHeights = new Array(N).fill(H);

                if (!isHealedRef.current) {
                    const i = distortedIndexRef.current;
                    const y = distortionYRef.current;
                    
                    const T = Math.max(0, Math.min(trackHeight, y - H / 2));
                    const B = Math.max(0, Math.min(trackHeight, y + H / 2));

                    const h_active = B - T;
                    const h_above = i > 0 ? T / i : 0;
                    const h_below = i < N - 1 ? (trackHeight - B) / (N - i - 1) : 0;

                    slotHeights = slotHeights.map((_, idx) => {
                        if (idx < i) return h_above;
                        if (idx === i) return h_active;
                        return h_below;
                    });
                }

                slotHeightsRef.current = slotHeights;

                iconWrappers.forEach((wrapper, idx) => {
                    wrapper.style.height = `${slotHeights[idx]}px`;
                    wrapper.style.transition = (isDragging.current && !isHealedRef.current)
                        ? 'none' 
                        : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                });
            }

            iconWrappers.forEach((wrapper, idx) => {
                const innerIcon = wrapper.querySelector('.icon-inner') as HTMLElement | null;
                if (innerIcon) {
                    innerIcon.style.opacity = idx === activeIndex ? '1' : '0.4';
                    innerIcon.style.transform = idx === activeIndex ? 'scale(1.3)' : 'scale(1)';
                }
            });
        }

        let expandedThumbHeight = 0;
        let expandedThumbY = 0;

        if (N > 0) {
            const slots = slotHeightsRef.current;
            const idx = Math.max(0, Math.min(parentIndex, N - 1));

            let accumulatedY = 0;
            for (let j = 0; j < idx; j++) {
                accumulatedY += slots[j];
            }

            const hCurrent = slots[idx];
            const hNext = (idx + 1 < N) ? slots[idx + 1] : hCurrent;

            expandedThumbHeight = hCurrent + (hNext - hCurrent) * localProgress;
            expandedThumbY = accumulatedY + hCurrent * localProgress;
        }

        let thumbHeight = isExpanded ? expandedThumbHeight : collapsedThumbHeight;
        let thumbY = isExpanded ? expandedThumbY : collapsedThumbY;

        if (P_top < 0) {
            const squish = Math.abs(P_top);
            thumbHeight = Math.max(12, thumbHeight - squish);
            thumbY = 0;
        } else if (P_top > P_max) {
            const squish = P_top - P_max;
            thumbHeight = Math.max(12, thumbHeight - squish);
            thumbY = (trackHeight - thumbHeight);
        }

        if (!isDragging.current && !isScrolling.current) {
            thumbHitboxRef.current.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
        } else {
            thumbHitboxRef.current.style.transition = isDragging.current ? 'opacity 0.3s ease-out' : 'opacity 0.3s ease-out, transform 0.1s linear';
        }

        thumbHitboxRef.current.style.height = `${thumbHeight}px`;
        thumbHitboxRef.current.style.transform = `translateY(${thumbY}px)`;

        const isVisible = isScrolling.current || isExpanded;

        thumbHitboxRef.current.style.opacity = isVisible ? '1' : '0';
        thumbHitboxRef.current.style.pointerEvents = isVisible ? 'auto' : 'none';

        // 🟢 ИЗМЕНЕНО: Адаптация под любую тему
        if (isExpanded) {
            thumbVisualRef.current.style.width = '48px';
            thumbVisualRef.current.style.right = '8px';
            thumbVisualRef.current.style.borderRadius = '24px';
            thumbVisualRef.current.className = "absolute h-full transition-all duration-300 ease-out box-border bg-theme-panel/80 backdrop-blur-md border border-theme-border shadow-lg";
        } else {
            thumbVisualRef.current.style.width = '4px';
            thumbVisualRef.current.style.right = '3px';
            thumbVisualRef.current.style.borderRadius = '9999px';
            // В свернутом состоянии используем цвет текста (bg-current), чтобы на светлом фоне ползунок был темным, а на темном - светлым
            thumbVisualRef.current.className = "absolute h-full transition-all duration-300 ease-out box-border bg-current opacity-30 text-theme-text";
        }

        if (iconsContainerRef.current) {
            iconsContainerRef.current.style.opacity = isExpanded ? '1' : '0';
            iconsContainerRef.current.style.transform = isExpanded ? 'translateX(0)' : 'translateX(10px)';
        }
        
        wasExpandedRef.current = isExpanded;

    }, [screens.length]);

    const wakeUpScrollbar = useCallback(() => {
        isScrolling.current = true;

        if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
                updateScrollbar();
                rafRef.current = null;
            });
        }

        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            updateScrollbar();
        }, 1000);
    }, [updateScrollbar]);

    useEffect(() => {
        updateScrollbar();
        window.addEventListener('resize', updateScrollbar);
        return () => {
            window.removeEventListener('resize', updateScrollbar);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [updateScrollbar]);

    const handleGlobalPointerMove = useCallback((e: globalThis.PointerEvent) => {
        if (!isDragging.current || !containerRef.current || !trackRef.current) return;

        const trackRect = trackRef.current.getBoundingClientRect();
        const N = screens.length;
        const C = containerRef.current.clientHeight;
        const maxScroll = Math.max(C * (N - 1), 1);
        const H = trackRect.height / N;
        const scrollFactor = C / H;

        let currentDragY = (e.clientY - trackRect.top) - dragOffset.current;
        currentDragY = Math.max(0, Math.min(currentDragY, trackRect.height));

        const dy_finger = currentDragY - lastDragYRef.current;
        lastDragYRef.current = currentDragY;

        let P_top = containerRef.current.scrollTop;
        let dy_scroll = 0;

        if (!isHealedRef.current) {
            const Y_ideal = (P_top / C) * H + H / 2;
            let currentRatchetY = distortionStartYRef.current;
            const toleranceZone = H * 0.15;

            const isAbove = currentRatchetY < Y_ideal;

            if (isAbove) {
                if (currentDragY > currentRatchetY) {
                    distortionStartYRef.current = Math.min(currentDragY, Y_ideal);
                }
            } else {
                if (currentDragY < currentRatchetY) {
                    distortionStartYRef.current = Math.max(currentDragY, Y_ideal);
                }
            }

            const newRatchetY = distortionStartYRef.current;

            const isPushingWall = isAbove ? (currentDragY < newRatchetY - 1) : (currentDragY > newRatchetY + 1);

            if (isPushingWall) {
                if (!isVibratingRef.current) {
                    if (onSwipeBlockedRef.current) onSwipeBlockedRef.current();

                    if (typeof window !== 'undefined' && navigator && navigator.vibrate) {
                        navigator.vibrate(15);
                    }
                    if (thumbVisualRef.current && thumbVisualRef.current.animate) {
                        isVibratingRef.current = true;
                        const anim = thumbVisualRef.current.animate([
                            { transform: 'translateX(0)' },
                            { transform: 'translateX(-4px)' },
                            { transform: 'translateX(4px)' },
                            { transform: 'translateX(-4px)' },
                            { transform: 'translateX(4px)' },
                            { transform: 'translateX(0)' }
                        ], { duration: 250, easing: 'ease-in-out' });
                        anim.onfinish = () => { isVibratingRef.current = false; };
                    }
                }
            }

            distortionYRef.current = newRatchetY;

            if (isAbove && currentDragY > Y_ideal) {
                dy_scroll = currentDragY - Math.max(currentDragY - dy_finger, Y_ideal);
            } else if (!isAbove && currentDragY < Y_ideal) {
                dy_scroll = currentDragY - Math.min(currentDragY - dy_finger, Y_ideal);
            }

            if (Math.abs(Y_ideal - newRatchetY) <= toleranceZone) {
                isHealedRef.current = true;
            }

        } else {
            dy_scroll = dy_finger;
            distortionYRef.current += dy_finger;
        }

        if (dy_scroll !== 0) {
            P_top += dy_scroll * scrollFactor;
            containerRef.current.scrollTop = Math.max(0, Math.min(P_top, maxScroll));
        }

        updateScrollbar();
    }, [screens.length, updateScrollbar]);

    const handleGlobalPointerUp = useCallback(() => {
        isDragging.current = false;
        document.body.style.userSelect = '';

        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);

        if (containerRef.current) {
            containerRef.current.style.scrollSnapType = 'y mandatory';
            containerRef.current.style.scrollBehavior = 'smooth';

            const { scrollTop, clientHeight } = containerRef.current;
            const targetIndex = Math.round(scrollTop / clientHeight);
            containerRef.current.scrollTo({ top: targetIndex * clientHeight, behavior: 'smooth' });
        }

        updateScrollbar();
    }, [handleGlobalPointerMove, updateScrollbar]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        isDragging.current = true;
        e.preventDefault();
        document.body.style.userSelect = 'none';

        const thumbRect = thumbHitboxRef.current!.getBoundingClientRect();
        const trackRect = trackRef.current!.getBoundingClientRect();
        
        dragOffset.current = e.clientY - thumbRect.top;
        
        const initialDragY = e.clientY - trackRect.top - dragOffset.current;
        lastDragYRef.current = initialDragY;

        if (containerRef.current) {
            containerRef.current.style.scrollSnapType = 'none';
            containerRef.current.style.scrollBehavior = 'auto';
        }

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
    }, [handleGlobalPointerMove, handleGlobalPointerUp]);

    if (!screens || screens.length === 0) return null;

    return (
        <div
            ref={containerRef}
            onScroll={wakeUpScrollbar}
            // 🟢 ИЗМЕНЕНО: Убрали bg-zinc-950, поставили прозрачный фон (чтобы видеть фон приложения, либо bg-theme-main)
            className="h-full w-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-theme-main overscroll-none"
        >
            {screens.map((screen, index) => (
                <div
                    key={screen.id}
                    data-screen-index={index}
                    // 🟢 ИЗМЕНЕНО: Используем класс bg-theme-main по умолчанию вместо bg-zinc-900
                    className={`h-full w-full max-w-full snap-start snap-always relative ${screen.bgClass || 'bg-theme-main'}`}
                >
                    {/* СЛОЙ 1: Скроллируемый контент */}
                    <div 
                        data-scroller="true"
                        className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden safe-padding"
                        onScroll={wakeUpScrollbar}
                        style={{ contentVisibility: 'auto' }}
                    >
                        {screen.content}
                    </div>
                    
                    {/* СЛОЙ 2: Портал-оверлей для фиксированных кнопок */}
                    <div id={`overlay-${screen.id}`} className="absolute inset-0 pointer-events-none z-[100]"></div>
                </div>
            ))}

            <div
                ref={trackRef}
                className="fixed right-0 top-[env(safe-area-inset-top)] bottom-[env(safe-area-inset-bottom)] w-[64px] z-[120] touch-none pointer-events-none select-none"
                style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            >
                <div
                    ref={thumbHitboxRef}
                    onPointerEnter={() => { isHoveringThumb.current = true; updateScrollbar(); }}
                    onPointerLeave={() => { isHoveringThumb.current = false; updateScrollbar(); }}
                    onPointerDown={handlePointerDown}
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute top-0 right-0 w-[64px] z-10 cursor-pointer pointer-events-auto select-none"
                    style={{
                        opacity: '0',
                        touchAction: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none'
                    }}
                >
                    <div
                        ref={thumbVisualRef}
                        className="absolute h-full transition-all duration-300 ease-out box-border"
                        style={{ width: '4px', right: '3px' }}
                    />
                </div>

                <div
                    ref={iconsContainerRef}
                    // 🟢 ИЗМЕНЕНО: Добавили text-theme-text, чтобы иконки брали цвет темы
                    className="absolute right-[8px] w-[48px] top-0 bottom-0 flex flex-col items-center transition-all duration-300 ease-out pointer-events-none z-20 box-border text-theme-text"
                    style={{ opacity: '0' }}
                >
                    {screens.map((screen) => (
                        <div
                            key={`icon-${screen.id}`}
                            className="icon-wrapper flex justify-center items-center w-full"
                        >
                            <div className="icon-inner flex justify-center items-center text-2xl transition-all duration-200 leading-none">
                                {screen.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

HybridScrollView.displayName = 'HybridScrollView';