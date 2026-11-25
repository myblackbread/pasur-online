'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, Bell } from 'lucide-react';
import { useHubNavigation } from './HubNavigationContext';
import { HubSearchContext } from './HubSearchBus';
import { HubSearchBar } from './HubSearchBar';
import { MYCapsuleActionContext } from './MYCapsuleActionBus';
import { SheetContext, SheetHost } from './SheetContract';
import { HubNotificationContext } from './HubNotificationBus';
import { HubNotificationOverlay } from './HubNotificationOverlay';
import { HybridHistoryManager } from './HybridHistoryManager';
import { HubNavigationStack } from './HubNavigationStack';
import { HubBottomBar } from './HubBottomBar';
import { myGetPlatformType } from './shared/platform/MYPlatformType';

export interface ScrollScreen {
    id: string;
    title?: string;
    icon: React.ReactNode;
    content: React.ReactNode;
    bgClass?: string;
}

export interface CapsuleActionItem {
    id: string;
    icon: React.ElementType<any>;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}

export interface HybridScrollViewProps {
    screens: ScrollScreen[];
    onSwipeBlocked?: () => void;
}

type CapsulePhase = 'collapsed' | 'expanding' | 'expanded' | 'hiding-items' | 'collapsing';
type ScrubState = { type: 'none' } | { type: 'ideal' } | { type: 'tooHigh'; bestY: number } | { type: 'tooLow'; bestY: number };

const vibrate = (type: 'light' | 'medium') => {
    if (typeof window !== 'undefined' && navigator && navigator.vibrate) {
        navigator.vibrate(type === 'medium' ? 15 : 10);
    }
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;
const springTransition: Transition = { type: 'spring', stiffness: 280, damping: 25, mass: 0.85 };
const listVariants: Variants = {
    idle: { transition: { staggerChildren: 0.03, staggerDirection: 1 } },
    runCascade: { transition: { delayChildren: 0.08, staggerChildren: 0.045, staggerDirection: -1 } },
};
const itemVariants: Variants = {
    idle: { opacity: 0, y: -18, scale: 0.6, transition: { duration: 0.12, ease: 'easeIn' } },
    runCascade: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 340, damping: 22, mass: 0.7 } },
};

export const HybridScrollViewInner = React.memo(({ screens = [], onSwipeBlocked }: HybridScrollViewProps) => {
    const { activeHubId, setActiveHubId, commitHubHistory, currentBackAction } = useHubNavigation();
    const searchCtx = React.useContext(HubSearchContext);
    const sheetCtx = React.useContext(SheetContext);
    const capsuleCtx = React.useContext(MYCapsuleActionContext);
    const notifCtx = React.useContext(HubNotificationContext);

    const isSearchOpen = searchCtx?.isSearchOpen || false;
    const activeSearchConfig = searchCtx?.activeConfig;
    const canGoBack = Boolean(currentBackAction?.canGoBack);
    const isSheetOpen = sheetCtx?.hasActiveSheet || false;
    const openNotifications = notifCtx?.openNotifications;

    const [isScrollActive, setIsScrollActive] = useState(false);
    const isScrollActiveRef = useRef(false);

    // Отключаем автоматическое восстановление скролла браузером
    useEffect(() => {
        if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    useEffect(() => {
        HybridHistoryManager.setDispatcher(() => {
            const isIOS = myGetPlatformType() === 'ios';

            if (notifCtx?.isOpen && notifCtx.closeNotifications) {
                notifCtx.closeNotifications();
                if (!isIOS) return;
            }
            if (sheetCtx?.hasActiveSheet && sheetCtx.activeSheet) {
                sheetCtx.activeSheet.onDismiss?.();
                sheetCtx.close(sheetCtx.activeSheet.id);
                if (!isIOS) return;
            }
            if (searchCtx?.isSearchOpen && searchCtx.setIsSearchOpen) {
                searchCtx.setIsSearchOpen(false);
                if (!isIOS) return;
            }
            if (currentBackAction?.canGoBack) {
                currentBackAction.action({ options: { animated: !isIOS } });
                return;
            }
            const prevHub = HybridHistoryManager.popHub();
            if (prevHub) {
                setActiveHubId(prevHub, { recordHistory: false });
            }
        });
    }, [notifCtx, sheetCtx, searchCtx, currentBackAction, setActiveHubId]);

    const capsuleMorphId = React.useId();

    const activeCapsuleRequests = useMemo(() => {
        if (!capsuleCtx || !capsuleCtx.requests) return [];
        return capsuleCtx.requests;
    }, [capsuleCtx]);

    const hasCapsuleSheet = activeCapsuleRequests.length > 0;

    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbHitboxRef = useRef<HTMLDivElement>(null);
    const iconsContainerRef = useRef<HTMLDivElement>(null);

    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const programmaticScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const failsafeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number | null>(null);

    const isDragging = useRef<boolean>(false);
    const isScrolling = useRef<boolean>(false);
    const isTouchingContainerRef = useRef<boolean>(false);
    const isInitialPositionAppliedRef = useRef<boolean>(false);

    const modeRef = useRef<'scroll' | 'hub' | 'control'>('scroll');
    const [currentMode, setCurrentMode] = useState<'scroll' | 'hub' | 'control'>('scroll');

    const [capsulePhase, setCapsulePhase] = useState<CapsulePhase>('collapsed');
    const capsulePhaseRef = useRef<CapsulePhase>('collapsed');
    capsulePhaseRef.current = capsulePhase;

    const controlOriginYRef = useRef<number | null>(null);
    const scrubState = useRef<ScrubState>({ type: 'none' });
    const dragStartY = useRef<number>(0);
    const hasMovedPastThreshold = useRef<boolean>(false);
    const tabBarTop = useRef<number>(0);
    const tabBarBottom = useRef<number>(0);

    const initialIdx = useMemo(() => {
        if (!activeHubId || screens.length === 0) return 0;
        const found = screens.findIndex((s) => s.id === activeHubId);
        return found >= 0 ? found : 0;
    }, [activeHubId, screens]);

    const [activeIdx, setActiveIdx] = useState<number>(initialIdx);
    const activeIndexRef = useRef<number>(initialIdx);
    const programmaticTargetIdxRef = useRef<number | null>(null);

    const onSwipeBlockedRef = useRef(onSwipeBlocked);
    onSwipeBlockedRef.current = onSwipeBlocked;
    const screensRef = useRef(screens);
    screensRef.current = screens;

    useIsomorphicLayoutEffect(() => {
        if (screens[0] && !activeHubId) {
            setActiveHubId(screens[0].id, { recordHistory: false });
        }
    }, [screens, activeHubId, setActiveHubId]);

    useEffect(() => {
        if (!containerRef.current || !isInitialPositionAppliedRef.current) return;
        const targetIndex = screensRef.current.findIndex((s) => s.id === activeHubId);

        if (targetIndex !== -1 && targetIndex !== activeIndexRef.current) {
            programmaticTargetIdxRef.current = targetIndex;
            activeIndexRef.current = targetIndex;
            setActiveIdx(targetIndex);

            const C = containerRef.current.clientHeight;
            const isIOS = myGetPlatformType() === 'ios';

            containerRef.current.scrollTo({
                top: targetIndex * C,
                behavior: isIOS ? 'auto' : 'smooth'
            });

            if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current);
            programmaticScrollTimeoutRef.current = setTimeout(() => {
                programmaticTargetIdxRef.current = null;
            }, 600);
        }
    }, [activeHubId]);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
            if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current);
            if (failsafeTimeoutRef.current) clearTimeout(failsafeTimeoutRef.current);
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        };
    }, []);

    const buttonSize = 36;
    const gap = 8;
    const paddingY = 8;

    const DYNAMIC_CAPSULE_ACTIONS = useMemo(() => {
        const actions: CapsuleActionItem[] = [];

        activeCapsuleRequests.forEach((req, idx) => {
            actions.push({
                id: req.id || `capsule-sheet-${idx}`,
                icon: req.icon || MoreHorizontal,
                label: req.label || 'Действие',
                onClick: () => req.onAction(capsuleMorphId),
            });
        });

        actions.push({ id: 'bell', icon: Bell, label: 'Уведомления' });
        return actions;
    }, [activeCapsuleRequests, capsuleMorphId]);

    const dynamicActionsCount = 1 + (canGoBack ? 1 : 0) + DYNAMIC_CAPSULE_ACTIONS.length + (activeSearchConfig ? 1 : 0);
    const closedCapsuleHeight = dynamicActionsCount * buttonSize + (dynamicActionsCount - 1) * gap + paddingY * 2;
    const searchOpenCapsuleHeight = buttonSize + paddingY * 2;
    const controlCapsuleWidth = buttonSize + 16;

    const metricsRef = useRef({ closedCapsuleHeight, searchOpenCapsuleHeight, isSearchOpen, isSheetOpen });
    metricsRef.current = { closedCapsuleHeight, searchOpenCapsuleHeight, isSearchOpen, isSheetOpen };

    const clampY = (top: number, height: number, containerHeight: number, margin = 8) => {
        return Math.max(margin, Math.min(containerHeight - height - margin, top));
    };

    const updateScrollbar = useCallback(() => {
        const currentScreens = screensRef.current;
        if (!containerRef.current || !trackRef.current || !thumbHitboxRef.current || currentScreens.length === 0) return;

        const { closedCapsuleHeight, searchOpenCapsuleHeight, isSearchOpen } = metricsRef.current;
        const currentCapsuleHeight = isSearchOpen ? searchOpenCapsuleHeight : closedCapsuleHeight;

        const C = containerRef.current.clientHeight;
        if (C <= 0) return;

        const P_top = containerRef.current.scrollTop;
        const trackHeight = trackRef.current.clientHeight;
        const N = currentScreens.length;
        const P_max = Math.max(C * (N - 1), 1);
        const H = trackHeight / N;

        const safe_P_top = Math.max(0, Math.min(P_top, P_max));
        const parentIndex = Math.floor(safe_P_top / C);
        const remainder = safe_P_top % C;
        const progress = remainder / C;

        if (
            modeRef.current !== 'hub' &&
            isInitialPositionAppliedRef.current &&
            programmaticTargetIdxRef.current === null
        ) {
            const activeIndex = activeIndexRef.current;
            const expectedTop = activeIndex * C;

            if (Math.abs(safe_P_top - expectedTop) > 5) {
                if (!HybridHistoryManager.hasActiveTransaction()) {
                    HybridHistoryManager.startTransaction();
                }
            }

            const nextIdx = N > 1 ? Math.round(Math.max(0, Math.min(1, safe_P_top / P_max)) * (N - 1)) : 0;
            if (activeIndex !== nextIdx) {
                activeIndexRef.current = nextIdx;
                setActiveIdx(nextIdx);
                if (currentScreens[nextIdx]) {
                    setActiveHubId(currentScreens[nextIdx].id, { recordHistory: false });
                }
            }
        }

        const activeIndex = activeIndexRef.current;

        const children = Array.from(containerRef.current.children) as HTMLElement[];
        const scrollers = children.map(c => (c.querySelector('[data-scroller="true"]') as HTMLElement) || c);

        const getLocalScrollbarMetrics = (index: number) => {
            if (index < 0 || index >= N) return { y: 0, height: 36 };

            const scroller = scrollers[index];
            if (!scroller) return { y: 0, height: 36 };

            const sHeight = Math.max(scroller.scrollHeight, C);
            const sTop = scroller.scrollTop;

            const thumbHeight = Math.max(36, Math.min(trackHeight, (C / sHeight) * trackHeight));
            const maxScroll = Math.max(sHeight - C, 1);
            const scrollRatio = Math.max(0, Math.min(1, sTop / maxScroll));

            const y = scrollRatio * (trackHeight - thumbHeight);
            return { y, height: thumbHeight };
        };

        const metricsCurrent = getLocalScrollbarMetrics(parentIndex);
        const metricsNext = parentIndex + 1 < N ? getLocalScrollbarMetrics(parentIndex + 1) : metricsCurrent;

        const normalHeight = metricsCurrent.height + (metricsNext.height - metricsCurrent.height) * progress;
        const normalY = metricsCurrent.y + (metricsNext.y - metricsCurrent.y) * progress;

        let finalTop = normalY;
        let finalHeight = normalHeight;

        if (modeRef.current === 'hub' && N > 1) {
            finalTop = scrubState.current.type === 'none' ? activeIndex * H : tabBarTop.current;
            const finalBottom = scrubState.current.type === 'none' ? (activeIndex * H) + H : tabBarBottom.current;
            finalHeight = Math.max(finalBottom - finalTop, 10);
        } else if (modeRef.current === 'control') {
            if (controlOriginYRef.current !== null) {
                finalTop = clampY(controlOriginYRef.current - currentCapsuleHeight / 2, currentCapsuleHeight, trackHeight);
            } else {
                const scrollbarCenter = normalY + normalHeight / 2;
                finalTop = clampY(scrollbarCenter - currentCapsuleHeight / 2, currentCapsuleHeight, trackHeight);
            }
            finalHeight = currentCapsuleHeight;
        }

        thumbHitboxRef.current.style.height = `${finalHeight}px`;
        thumbHitboxRef.current.style.transform = `translateY(${finalTop}px)`;

        const isVisible = isScrolling.current || modeRef.current !== 'scroll';
        thumbHitboxRef.current.style.opacity = isVisible ? '1' : '0';

        if (iconsContainerRef.current) {
            const showIcons = modeRef.current === 'hub' && N > 1;
            iconsContainerRef.current.style.opacity = showIcons ? '1' : '0';
            iconsContainerRef.current.style.transform = showIcons ? 'translateX(0)' : 'translateX(10px)';

            if (showIcons) {
                Array.from(iconsContainerRef.current.children).forEach((wrapper: any, index) => {
                    const absY = (index + 0.5) * H;
                    wrapper.style.position = 'absolute';
                    wrapper.style.top = `${absY}px`;
                    wrapper.style.transform = 'translateY(-50%)';

                    let isPathOpen = true;
                    if (scrubState.current.type === 'tooHigh') isPathOpen = index >= activeIndex;
                    if (scrubState.current.type === 'tooLow') isPathOpen = index <= activeIndex;

                    const isActive = index === activeIndex;
                    const innerIcon = wrapper.querySelector('.icon-inner');
                    if (innerIcon) {
                        innerIcon.style.opacity = isPathOpen ? (isActive ? '1' : '0.4') : '0';
                        innerIcon.style.transform = isPathOpen ? (isActive ? 'scale(1.3)' : 'scale(1)') : 'scale(0.5)';
                    }
                });
            }
        }
    }, [setActiveHubId]);

    useEffect(() => {
        if (thumbHitboxRef.current) {
            thumbHitboxRef.current.style.transition = 'height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        }
        updateScrollbar();
    }, [isSearchOpen, canGoBack, hasCapsuleSheet, activeCapsuleRequests.length, screens.length, updateScrollbar]);

    const startCapsuleCollapse = useCallback(() => {
        if (modeRef.current !== 'control') return;
        setCapsulePhase('hiding-items');

        if (failsafeTimeoutRef.current) clearTimeout(failsafeTimeoutRef.current);
        failsafeTimeoutRef.current = setTimeout(() => {
            setCapsulePhase((prev) => (prev === 'hiding-items' ? 'collapsing' : prev));
        }, 280);
    }, []);

    const scheduleSettleCommit = useCallback(() => {
        if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = setTimeout(() => {
            if (
                programmaticTargetIdxRef.current === null &&
                !isDragging.current &&
                !isTouchingContainerRef.current &&
                modeRef.current === 'scroll'
            ) {
                const settledScreen = screensRef.current[activeIndexRef.current];
                if (settledScreen) {
                    commitHubHistory(settledScreen.id);
                }
            }
        }, 150);
    }, [commitHubHistory]);

    const wakeUpScrollbar = useCallback((e?: Event) => {
        if (e && e.target !== containerRef.current) {
            const target = e.target as HTMLElement;
            if (!target || !target.dataset || !target.dataset.scroller) return;
        }

        isScrolling.current = true;
        if (!isScrollActiveRef.current) {
            isScrollActiveRef.current = true;
            setIsScrollActive(true);
        }

        if (failsafeTimeoutRef.current) {
            clearTimeout(failsafeTimeoutRef.current);
            failsafeTimeoutRef.current = null;
        }

        if (programmaticTargetIdxRef.current !== null) {
            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(() => {
                    updateScrollbar();
                    rafRef.current = null;
                });
            }
            return;
        }

        scheduleSettleCommit();

        if (modeRef.current !== 'scroll' && !isDragging.current) {
            if (!metricsRef.current.isSearchOpen && !metricsRef.current.isSheetOpen) {
                modeRef.current = 'scroll';
                setCurrentMode('scroll');
                setCapsulePhase('collapsed');
                scrubState.current = { type: 'none' };
                controlOriginYRef.current = null;
            }
        }

        if (thumbHitboxRef.current && !isDragging.current) {
            thumbHitboxRef.current.style.transition = 'opacity 0.3s ease-out';
        }

        if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
                updateScrollbar();
                rafRef.current = null;
            });
        }

        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            isScrollActiveRef.current = false;
            setIsScrollActive(false);
            updateScrollbar();
        }, 1200);
    }, [updateScrollbar, scheduleSettleCommit]);

    useIsomorphicLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const applyInitialPosition = () => {
            if (!isInitialPositionAppliedRef.current && el.clientHeight > 0) {
                isInitialPositionAppliedRef.current = true;
                const targetIdx = activeIndexRef.current;
                const prevBehavior = el.style.scrollBehavior;
                el.style.scrollBehavior = 'auto';
                // Всегда гарантированно выставляем scrollTop для начального экрана
                el.scrollTop = targetIdx * el.clientHeight;

                requestAnimationFrame(() => {
                    el.style.scrollBehavior = prevBehavior;
                });
            }
        };

        applyInitialPosition();

        el.addEventListener('scroll', wakeUpScrollbar, { passive: true, capture: true });
        const containerObserver = new ResizeObserver(() => {
            applyInitialPosition();
            updateScrollbar();
        });
        containerObserver.observe(el);

        return () => {
            el.removeEventListener('scroll', wakeUpScrollbar, { capture: true } as any);
            containerObserver.disconnect();
        };
    }, [updateScrollbar, wakeUpScrollbar]);

    useEffect(() => {
        if (capsulePhase === 'collapsing') {
            if (failsafeTimeoutRef.current) clearTimeout(failsafeTimeoutRef.current);
            failsafeTimeoutRef.current = setTimeout(() => {
                setCapsulePhase('collapsed');
                modeRef.current = 'scroll';
                setCurrentMode('scroll');
                controlOriginYRef.current = null;
                if (thumbHitboxRef.current) {
                    thumbHitboxRef.current.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
                }
                updateScrollbar();
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = setTimeout(() => {
                    isScrolling.current = false;
                    isScrollActiveRef.current = false;
                    setIsScrollActive(false);
                    updateScrollbar();
                }, 1000);
            }, 500);
        }
    }, [capsulePhase, updateScrollbar]);

    const handleGlobalPointerMove = useCallback((e: globalThis.PointerEvent) => {
        if (!isDragging.current || !trackRef.current || !containerRef.current) return;

        if (modeRef.current === 'scroll') {
            if (Math.abs(e.clientY - dragStartY.current) > 10) {
                hasMovedPastThreshold.current = true;
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
            }
            return;
        }

        if (modeRef.current === 'control') return;

        if (modeRef.current === 'hub') {
            const N = screensRef.current.length;
            if (N <= 1) return;

            const trackRect = trackRef.current.getBoundingClientRect();
            const C = containerRef.current.clientHeight;
            const H = trackRect.height / N;
            const Y_f = e.clientY - trackRect.top;
            const r = 22.0;

            const y_top_ideal = activeIndexRef.current * H;
            const y_bottom_ideal = y_top_ideal + H;

            switch (scrubState.current.type) {
                case 'tooHigh': {
                    if (Y_f < scrubState.current.bestY) {
                        tabBarTop.current = scrubState.current.bestY - r - Math.sqrt(scrubState.current.bestY - Y_f) * 1.5;
                        tabBarBottom.current = y_bottom_ideal;
                    } else {
                        if (Y_f - r >= y_top_ideal) {
                            scrubState.current = { type: 'ideal' };
                            tabBarTop.current = y_top_ideal;
                            tabBarBottom.current = y_bottom_ideal;
                            vibrate('light');
                        } else {
                            scrubState.current = { type: 'tooHigh', bestY: Y_f };
                            tabBarTop.current = Y_f - r;
                            tabBarBottom.current = y_bottom_ideal;
                        }
                    }
                    break;
                }
                case 'tooLow': {
                    if (Y_f > scrubState.current.bestY) {
                        tabBarTop.current = y_top_ideal;
                        tabBarBottom.current = scrubState.current.bestY + r + Math.sqrt(Y_f - scrubState.current.bestY) * 1.5;
                    } else {
                        if (Y_f + r <= y_bottom_ideal) {
                            scrubState.current = { type: 'ideal' };
                            tabBarTop.current = y_top_ideal;
                            tabBarBottom.current = y_bottom_ideal;
                            vibrate('light');
                        } else {
                            scrubState.current = { type: 'tooLow', bestY: Y_f };
                            tabBarTop.current = y_top_ideal;
                            tabBarBottom.current = Y_f + r;
                        }
                    }
                    break;
                }
                case 'ideal':
                case 'none': {
                    const targetIndex = Math.max(0, Math.min(N - 1, Math.floor(Y_f / H)));

                    if (targetIndex !== activeIndexRef.current) {
                        activeIndexRef.current = targetIndex;
                        setActiveIdx(targetIndex);

                        if (screensRef.current[targetIndex]) {
                            setActiveHubId(screensRef.current[targetIndex].id, { recordHistory: false });
                        }
                        vibrate('light');

                        containerRef.current.scrollTo({ top: targetIndex * C, behavior: 'auto' });

                        const hubContainer = containerRef.current.children[targetIndex] as HTMLElement;
                        if (hubContainer) {
                            hubContainer.style.transformOrigin = 'center center';
                            hubContainer.style.transition = 'none';
                            hubContainer.style.transform = `scale(0.95)`;
                            hubContainer.style.opacity = '0';
                            void hubContainer.offsetHeight;
                            hubContainer.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out';
                            hubContainer.style.transform = `scale(1)`;
                            hubContainer.style.opacity = '1';
                        }
                    }
                    if (Y_f < 0) {
                        tabBarTop.current = -Math.sqrt(-Y_f) * 1.5;
                        tabBarBottom.current = H;
                        if (onSwipeBlockedRef.current) onSwipeBlockedRef.current();
                    } else if (Y_f > trackRect.height) {
                        tabBarTop.current = trackRect.height - H;
                        tabBarBottom.current = trackRect.height + Math.sqrt(Y_f - trackRect.height) * 1.5;
                        if (onSwipeBlockedRef.current) onSwipeBlockedRef.current();
                    } else {
                        tabBarTop.current = activeIndexRef.current * H;
                        tabBarBottom.current = activeIndexRef.current * H + H;
                    }
                    break;
                }
            }

            if (thumbHitboxRef.current) {
                thumbHitboxRef.current.style.transition = scrubState.current.type === 'ideal' || scrubState.current.type === 'none'
                    ? 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
            }
            updateScrollbar();
        }
    }, [setActiveHubId, updateScrollbar]);

    const handleGlobalPointerUp = useCallback(() => {
        isDragging.current = false;
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (containerRef.current) {
            containerRef.current.style.scrollSnapType = 'y mandatory';
            containerRef.current.style.scrollBehavior = 'smooth';
        }

        if (modeRef.current === 'hub') {
            modeRef.current = 'scroll';
            setCurrentMode('scroll');
            scrubState.current = { type: 'none' };
            setCapsulePhase('collapsed');

            const finalScreen = screensRef.current[activeIndexRef.current];
            if (finalScreen) {
                commitHubHistory(finalScreen.id);
            }

            if (thumbHitboxRef.current) {
                thumbHitboxRef.current.style.transition = 'height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease-out';
            }
            updateScrollbar();

            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => {
                isScrolling.current = false;
                isScrollActiveRef.current = false;
                setIsScrollActive(false);
                updateScrollbar();
            }, 1000);
        }
    }, [commitHubHistory, handleGlobalPointerMove, updateScrollbar]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('input, form, button')) return;

        isDragging.current = true;
        hasMovedPastThreshold.current = false;
        dragStartY.current = e.clientY;

        if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
        if (failsafeTimeoutRef.current) { clearTimeout(failsafeTimeoutRef.current); failsafeTimeoutRef.current = null; }
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }

        e.currentTarget.setPointerCapture(e.pointerId);

        const trackRect = trackRef.current?.getBoundingClientRect();
        const pointerYInsideTrack = trackRect ? e.clientY - trackRect.top : 0;
        const initialClientY = e.clientY;

        longPressTimerRef.current = setTimeout(() => {
            if (!hasMovedPastThreshold.current) {
                document.body.style.userSelect = 'none';
                if (containerRef.current) {
                    containerRef.current.style.scrollSnapType = 'none';
                    containerRef.current.style.scrollBehavior = 'auto';
                }

                let pressedOnThumb = false;
                const isThumbVisible = isScrolling.current || modeRef.current !== 'scroll';

                if (isThumbVisible && thumbHitboxRef.current) {
                    const thumbRect = thumbHitboxRef.current.getBoundingClientRect();
                    if (initialClientY >= thumbRect.top - 15 && initialClientY <= thumbRect.bottom + 15) {
                        pressedOnThumb = true;
                    }
                }

                if (pressedOnThumb) {
                    HybridHistoryManager.startTransaction();

                    modeRef.current = 'hub';
                    setCurrentMode('hub');
                    setCapsulePhase('collapsed');
                    hasMovedPastThreshold.current = true;

                    const N = screensRef.current.length;
                    const H = trackRect ? trackRect.height / N : 1;
                    const Y_f = pointerYInsideTrack;
                    const r = 22.0;

                    const y_top_ideal = activeIndexRef.current * H;
                    const y_bottom_ideal = y_top_ideal + H;

                    if (Y_f < y_top_ideal) {
                        scrubState.current = { type: 'tooHigh', bestY: Y_f };
                        tabBarTop.current = Y_f - r;
                        tabBarBottom.current = y_bottom_ideal;
                    } else if (Y_f > y_bottom_ideal) {
                        scrubState.current = { type: 'tooLow', bestY: Y_f };
                        tabBarTop.current = y_top_ideal;
                        tabBarBottom.current = Y_f + r;
                    } else {
                        scrubState.current = { type: 'ideal' };
                        tabBarTop.current = y_top_ideal;
                        tabBarBottom.current = y_bottom_ideal;
                    }

                    vibrate('medium');
                } else {
                    controlOriginYRef.current = pointerYInsideTrack;
                    modeRef.current = 'control';
                    setCurrentMode('control');
                    scrubState.current = { type: 'none' };
                    setCapsulePhase('expanding');
                    capsulePhaseRef.current = 'expanding';
                    vibrate('medium');
                }

                if (thumbHitboxRef.current) {
                    thumbHitboxRef.current.style.transition = 'height 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease';
                }
                updateScrollbar();
            }
        }, 350);

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
    }, [handleGlobalPointerMove, handleGlobalPointerUp, updateScrollbar]);

    const handleCapsuleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasMovedPastThreshold.current) return;

        if (currentMode === 'control' && (capsulePhase === 'expanded' || capsulePhase === 'expanding')) {
            if (isSearchOpen || isSheetOpen) return;
            vibrate('light');
            startCapsuleCollapse();
        }
    }, [currentMode, capsulePhase, isSearchOpen, isSheetOpen, startCapsuleCollapse]);

    const handleCapsuleAnimationComplete = useCallback((definition: string) => {
        if (definition === 'control' && capsulePhaseRef.current === 'expanding') {
            setCapsulePhase('expanded');
        } else if (definition === 'scroll' && capsulePhaseRef.current === 'collapsing') {
            if (failsafeTimeoutRef.current) clearTimeout(failsafeTimeoutRef.current);
            setCapsulePhase('collapsed');
            modeRef.current = 'scroll';
            setCurrentMode('scroll');
            controlOriginYRef.current = null;
            if (thumbHitboxRef.current) {
                thumbHitboxRef.current.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
            }
            updateScrollbar();
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => {
                isScrolling.current = false;
                isScrollActiveRef.current = false;
                setIsScrollActive(false);
                updateScrollbar();
            }, 1000);
        }
    }, [updateScrollbar]);

    const handleListAnimationComplete = useCallback((definition: string) => {
        if (definition === 'idle' && capsulePhaseRef.current === 'hiding-items') {
            if (failsafeTimeoutRef.current) clearTimeout(failsafeTimeoutRef.current);
            setCapsulePhase('collapsing');
        }
    }, []);

    let activeVariant = 'scroll';
    if (currentMode === 'control') {
        activeVariant = (capsulePhase === 'expanding' || capsulePhase === 'expanded' || capsulePhase === 'hiding-items') ? 'control' : 'scroll';
    } else if (currentMode === 'hub') {
        activeVariant = 'hub';
    }

    const areButtonsVisible = capsulePhase === 'expanding' || capsulePhase === 'expanded';
    const hitboxWidth = currentMode === 'control' ? (isSearchOpen ? 240 : controlCapsuleWidth) : 64;

    const capsuleVariants: Variants = useMemo(() => ({
        scroll: { width: 4, right: 4, height: '100%', paddingTop: 0, paddingBottom: 0 },
        hub: { width: 44, right: 10, height: '100%', paddingTop: 0, paddingBottom: 0 },
        control: { width: isSearchOpen ? 240 : controlCapsuleWidth, right: 6, height: '100%', paddingTop: paddingY, paddingBottom: paddingY },
    }), [controlCapsuleWidth, paddingY, isSearchOpen]);

    if (!screens || screens.length === 0) return null;
    const currentScreen = screens[activeIdx] || screens[0];

    const currentTitle = useMemo(() => {
        if (currentMode === 'hub') {
            return screens[activeIdx]?.title || '';
        }
        return currentBackAction?.title || currentScreen?.title || '';
    }, [currentMode, activeIdx, screens, currentBackAction, currentScreen]);

    const isBottomBarVisible = useMemo(() => {
        if (isSearchOpen || isSheetOpen || !currentTitle) return false;
        if (currentMode === 'control' || currentMode === 'hub') return true;
        if (currentMode === 'scroll') return isScrollActive;
        return false;
    }, [isSearchOpen, isSheetOpen, currentTitle, currentMode, isScrollActive]);

    return (
        <div className="relative w-full h-full overscroll-none select-none">
            <div
                ref={containerRef}
                onTouchStart={() => {
                    isTouchingContainerRef.current = true;
                    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
                }}
                onTouchEnd={() => {
                    isTouchingContainerRef.current = false;
                    scheduleSettleCommit();
                }}
                onTouchCancel={() => {
                    isTouchingContainerRef.current = false;
                    scheduleSettleCommit();
                }}
                className="h-full w-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scrollbar-none [&::-webkit-scrollbar]:hidden"
            >
                {screens.map((screen) => (
                    <div key={screen.id} className="h-full w-full max-w-full snap-start snap-always relative">
                        <HubNavigationStack
                            hubId={screen.id}
                            rootTitle={screen.title}
                            rootContent={screen.content}
                        />
                    </div>
                ))}
            </div>

            <div ref={trackRef} className="absolute top-[env(safe-area-inset-top)] bottom-[env(safe-area-inset-bottom)] right-[env(safe-area-inset-right)] w-8 pointer-events-none z-50">
                <div
                    className="absolute inset-0 pointer-events-auto touch-none cursor-pointer"
                    onPointerDown={handlePointerDown}
                    onContextMenu={(e) => e.preventDefault()}
                />

                <div
                    ref={thumbHitboxRef}
                    className="absolute top-0 right-0 pointer-events-none opacity-0"
                    style={{ width: `${hitboxWidth}px` }}
                >
                    <motion.div
                        layoutId={capsuleMorphId}
                        variants={capsuleVariants}
                        initial="scroll"
                        animate={activeVariant}
                        transition={springTransition}
                        onAnimationComplete={(def) => handleCapsuleAnimationComplete(def as string)}
                        onPointerDown={handlePointerDown}
                        onClick={handleCapsuleClick}
                        className={`
              absolute top-0 flex flex-col items-center justify-center overflow-hidden pointer-events-auto
              transition-colors duration-300 ease-out !rounded-full
              ${currentMode === 'control'
                                ? 'bg-neutral-900/85 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/60'
                                : currentMode === 'hub'
                                    ? 'bg-white/15 backdrop-blur-md border border-transparent shadow-none'
                                    : 'bg-white/40 border border-transparent shadow-none'
                            }
            `}
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none', willChange: 'width, height, right', opacity: isSheetOpen ? 0 : 1 }}
                    >
                        <AnimatePresence>
                            {currentMode === 'control' && capsulePhase === 'collapsed' && (
                                <motion.div
                                    key="capsule-dot"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute w-2 h-2 rounded-full bg-neutral-300"
                                />
                            )}
                        </AnimatePresence>

                        {currentMode === 'control' && (
                            <motion.div
                                variants={listVariants}
                                initial="idle"
                                animate={areButtonsVisible ? 'runCascade' : 'idle'}
                                onAnimationComplete={(def) => handleListAnimationComplete(def as string)}
                                style={{ gap: `${gap}px` }}
                                className="flex flex-col items-center justify-center h-full w-full pointer-events-none"
                            >
                                {!isSearchOpen && DYNAMIC_CAPSULE_ACTIONS.map(({ id, icon: Icon, label, onClick, disabled }) => (
                                    <motion.div key={id} variants={itemVariants} className="flex items-center justify-center">
                                        <button
                                            type="button"
                                            aria-label={label}
                                            disabled={disabled}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                vibrate('light');
                                                if (id === 'bell') {
                                                    if (openNotifications) openNotifications();
                                                } else {
                                                    onClick?.();
                                                }
                                            }}
                                            style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
                                            className="rounded-full flex items-center justify-center text-neutral-200 bg-white/10 hover:bg-white/20 active:scale-90 transition-transform disabled:opacity-40 disabled:pointer-events-none pointer-events-auto shrink-0"
                                        >
                                            {Icon && <Icon size={Math.round(buttonSize * 0.48)} strokeWidth={2.2} />}
                                        </button>
                                    </motion.div>
                                ))}

                                {!isSearchOpen && canGoBack && (
                                    <motion.div key="back-action-item" variants={itemVariants} className="flex items-center justify-center">
                                        <button
                                            type="button"
                                            aria-label="Назад"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                vibrate('light');
                                                currentBackAction?.action({ options: { animated: true } });
                                            }}
                                            style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
                                            className="rounded-full flex items-center justify-center text-white bg-indigo-500/80 hover:bg-indigo-500 active:scale-90 transition-transform pointer-events-auto shrink-0 shadow-lg shadow-indigo-500/30"
                                        >
                                            <ArrowLeft size={Math.round(buttonSize * 0.52)} strokeWidth={2.6} />
                                        </button>
                                    </motion.div>
                                )}

                                {activeSearchConfig && (
                                    <motion.div variants={itemVariants} className="flex items-center justify-center">
                                        <HubSearchBar buttonSize={buttonSize} />
                                    </motion.div>
                                )}

                                {!isSearchOpen && (
                                    <motion.div variants={itemVariants} className="flex items-center justify-center">
                                        <div
                                            style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
                                            className="flex items-center justify-center text-white pointer-events-none shrink-0 select-none"
                                        >
                                            <div className="scale-110">{currentScreen.icon}</div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {screens.length > 1 && (
                    <div ref={iconsContainerRef} className="absolute right-2.5 w-11 top-0 bottom-0 pointer-events-none box-border opacity-0 text-white z-0" style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
                        {screens.map((screen) => (
                            <div key={`icon-${screen.id}`} className="flex justify-center items-center w-full">
                                <div className="icon-inner flex justify-center items-center transition-all duration-300">
                                    {screen.icon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <HubBottomBar
                isVisible={isBottomBarVisible}
                currentMode={currentMode}
                icon={currentScreen.icon}
                title={currentTitle}
            />

            <SheetHost />
            <HubNotificationOverlay />
        </div>
    );
});

HybridScrollViewInner.displayName = 'HybridScrollViewInner';