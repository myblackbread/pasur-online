"use client";

import React from "react";
import { X, Check } from "lucide-react";

function applyRubberBand(overscroll: number, containerWidth: number) {
    const abs = Math.abs(overscroll);
    const RUBBER_COEFF = 0.55;
    const damped = (abs * containerWidth * RUBBER_COEFF) / (containerWidth + abs * RUBBER_COEFF);
    return overscroll < 0 ? -damped : damped;
}

type ActionButtonState =
    | "hidden"
    | "pending_cancel"
    | "cancel"
    | "confirm_pop"
    | "confirm_exit";

const HANDLE_RIGHT_INSET = 10;
const INACTIVITY_DELAY = 1200;
const MIN_PULL_DISTANCE = 32;
const SUBPIXEL_EPSILON = 1; // Стандартная субпиксельная погрешность DOM-скролла для дробных DPR

interface CachedMetrics<T> {
    containerW: number;
    contentW: number;
    maxScroll: number;
    threshold: number;
    handleX_0: number;
    handleX_1: number;
    centeredScrollLeft: number;
    items: Array<{ item: T; id: string; center: number; targetScroll: number; width: number }>;
}

export interface ElasticPullPickerProps<T> {
    items: T[];
    selectedId?: string | null;
    getItemId?: (item: T) => string;
    renderItem: (item: T, progress: number) => React.ReactNode;
    overlay?: React.ReactNode;
    onSelect: (item: T) => void;
    className?: string;
}

export function ElasticPullPicker<T>({
    items,
    selectedId,
    getItemId = (it: any) => it?.id ?? it?.code ?? String(it),
    renderItem,
    overlay,
    onSelect,
    className = "",
}: ElasticPullPickerProps<T>) {
    const scrollerRef = React.useRef<HTMLDivElement>(null);
    const spacerRef = React.useRef<HTMLDivElement>(null);
    const visualContentRef = React.useRef<HTMLDivElement>(null);
    const pickerWrapperRef = React.useRef<HTMLDivElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const handleRef = React.useRef<HTMLDivElement>(null);
    const pillWrapperRef = React.useRef<HTMLDivElement>(null);

    const isUnlockedRef = React.useRef(false);
    const isCalibratedStateRef = React.useRef(false);
    const isProgrammaticSyncRef = React.useRef(false);

    const isTouchingRef = React.useRef(false);
    const isSnappingRef = React.useRef(false);
    const isCollapsingRef = React.useRef(false);
    const lastScrollTimeRef = React.useRef(0);

    const [isWideMode, setIsWideMode] = React.useState(false);
    const isWideModeRef = React.useRef(false);

    const metricsRef = React.useRef<CachedMetrics<T>>({
        containerW: 0,
        contentW: 0,
        maxScroll: 0,
        threshold: 1,
        handleX_0: 0,
        handleX_1: 0,
        centeredScrollLeft: 0,
        items: [],
    });

    const currentVisualScrollRef = React.useRef(0);
    const warnedElementsRef = React.useRef<Set<string>>(new Set());

    const scrollEndTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const snappingSafetyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const inactivityTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const collapseRafRef = React.useRef<number | null>(null);
    const resizeRafRef = React.useRef<number | null>(null);

    const globalSelectedIdRef = React.useRef(selectedId);
    const [localSelectedId, setLocalSelectedId] = React.useState(selectedId);
    const localSelectedIdRef = React.useRef(selectedId);

    const [actionState, setActionState] = React.useState<ActionButtonState>("hidden");
    const actionStateRef = React.useRef<ActionButtonState>("hidden");

    const onSelectRef = React.useRef(onSelect);
    React.useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    const itemsRef = React.useRef(items);
    React.useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const getItemIdRef = React.useRef(getItemId);
    React.useEffect(() => {
        getItemIdRef.current = getItemId;
    }, [getItemId]);

    React.useEffect(() => {
        actionStateRef.current = actionState;
    }, [actionState]);

    const [progress, setProgress] = React.useState(0);
    const [isUnlocked, setIsUnlocked] = React.useState(false);

    // Оригинальная формула без искусственных буферов
    const getUncalibratedSpacerWidth = (metrics: CachedMetrics<T>) => {
        return Math.max(
            metrics.containerW + metrics.threshold,
            metrics.contentW + metrics.threshold - metrics.centeredScrollLeft
        );
    };

    const updateMetricsForSelectedId = (id: string | null | undefined) => {
        const matched = metricsRef.current.items.find((it) => it.id === id);
        const activeWidth = matched ? matched.width : (pillWrapperRef.current?.offsetWidth || 120);
        const containerW = metricsRef.current.containerW;

        metricsRef.current.handleX_0 = containerW - activeWidth - HANDLE_RIGHT_INSET;
        metricsRef.current.handleX_1 = containerW / 2 - activeWidth / 2;
        metricsRef.current.threshold = Math.max(1, metricsRef.current.handleX_0 - metricsRef.current.handleX_1);
        metricsRef.current.centeredScrollLeft = matched ? matched.targetScroll : 0;
    };

    const recalculateMetrics = () => {
        const scroller = scrollerRef.current;
        const visual = visualContentRef.current;
        if (!scroller || !visual) return metricsRef.current;

        const containerW = scroller.clientWidth;
        if (containerW <= 0) return metricsRef.current;

        const firstChild = visual.firstElementChild as HTMLElement | null;
        const lastChild = visual.lastElementChild as HTMLElement | null;

        if (firstChild && lastChild) {
            const padLeft = Math.max(16, Math.round(containerW / 2 - firstChild.offsetWidth / 2));
            const padRight = Math.max(16, Math.round(containerW / 2 - lastChild.offsetWidth / 2));
            const currentPadLeft = parseFloat(visual.style.paddingLeft) || 0;
            const currentPadRight = parseFloat(visual.style.paddingRight) || 0;

            if (Math.abs(currentPadLeft - padLeft) > 1) visual.style.paddingLeft = `${padLeft}px`;
            if (Math.abs(currentPadRight - padRight) > 1) visual.style.paddingRight = `${padRight}px`;
        }

        const contentW = visual.scrollWidth;
        const maxScroll = Math.max(0, contentW - containerW);
        const children = Array.from(visual.children) as HTMLElement[];

        const mappedItems = children.map((child, i) => {
            const item = itemsRef.current[i] || items[i];
            const id = getItemIdRef.current(item);
            const center = child.offsetLeft + child.offsetWidth / 2;
            const targetScroll = Math.max(0, Math.min(center - containerW / 2, maxScroll));
            return { item, id, center, targetScroll, width: child.offsetWidth || 120 };
        });

        const activeItem = mappedItems.find((it) => it.id === localSelectedIdRef.current) || mappedItems[0];
        const activeWidth = activeItem ? activeItem.width : 120;

        const handleX_0 = containerW - activeWidth - HANDLE_RIGHT_INSET;
        const handleX_1 = containerW / 2 - activeWidth / 2;
        const threshold = Math.max(1, handleX_0 - handleX_1);

        const centeredScrollLeft =
            isUnlockedRef.current && !isCalibratedStateRef.current
                ? metricsRef.current.centeredScrollLeft
                : activeItem
                    ? activeItem.targetScroll
                    : 0;

        const metrics = {
            containerW,
            contentW,
            maxScroll,
            threshold,
            handleX_0,
            handleX_1,
            centeredScrollLeft,
            items: mappedItems,
        };
        metricsRef.current = metrics;

        if (spacerRef.current) {
            spacerRef.current.style.width = isCalibratedStateRef.current
                ? `${contentW}px`
                : `${getUncalibratedSpacerWidth(metrics)}px`;
        }

        return metrics;
    };

    const calibrateToNativeScroll = () => {
        const scroller = scrollerRef.current;
        const spacer = spacerRef.current;
        const visual = visualContentRef.current;
        if (!scroller || !spacer || !visual || isCalibratedStateRef.current) return;
        const { contentW, maxScroll } = metricsRef.current;
        const clampedScroll = Math.max(0, Math.min(currentVisualScrollRef.current, maxScroll));

        isProgrammaticSyncRef.current = true;
        isCalibratedStateRef.current = true;
        spacer.style.width = `${contentW}px`;
        scroller.scrollLeft = clampedScroll;
        currentVisualScrollRef.current = clampedScroll;
        visual.style.transform = `translate3d(${-clampedScroll}px, 0, 0)`;
        requestAnimationFrame(() => {
            isProgrammaticSyncRef.current = false;
        });
    };

    const clearInactivityTimer = () => {
        if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
            inactivityTimeoutRef.current = null;
        }
    };

    const abortCollapseAnimation = () => {
        if (collapseRafRef.current) {
            cancelAnimationFrame(collapseRafRef.current);
            collapseRafRef.current = null;
        }
        isCollapsingRef.current = false;
    };

    const evaluateMode = (metrics: CachedMetrics<T>) => {
        if (metrics.containerW <= 0) return;

        const pullDistance = metrics.handleX_0 - metrics.handleX_1;
        const shouldBeWide = pullDistance < MIN_PULL_DISTANCE;

        if (shouldBeWide) {
            if (process.env.NODE_ENV !== "production") {
                const activeId = localSelectedIdRef.current ?? "unknown";
                const warnKey = `${activeId}-${metrics.containerW}`;
                if (!warnedElementsRef.current.has(warnKey)) {
                    warnedElementsRef.current.add(warnKey);
                    console.warn(
                        `[ElasticPullPicker]: Item "${activeId}" is too wide for container (${metrics.containerW}px). ` +
                        `Gesture pull distance: ${Math.round(pullDistance)}px (min: ${MIN_PULL_DISTANCE}px). ` +
                        `Smart-slider degraded to regular horizontal scroll.`
                    );
                }
            }

            if (!isWideModeRef.current) {
                isWideModeRef.current = true;
                setIsWideMode(true);
                clearInactivityTimer();
                abortCollapseAnimation();
                setActionState("hidden");

                setIsUnlocked(true);
                isUnlockedRef.current = true;
                setProgress(1);

                if (handleRef.current) handleRef.current.style.opacity = "0";
                if (overlayRef.current) overlayRef.current.style.opacity = "0";

                calibrateToNativeScroll();
            }
        } else {
            if (isWideModeRef.current) {
                isWideModeRef.current = false;
                setIsWideMode(false);
                clearInactivityTimer();
                abortCollapseAnimation();
                setActionState("hidden");

                setIsUnlocked(false);
                isUnlockedRef.current = false;
                isCalibratedStateRef.current = false;
                setProgress(0);

                if (handleRef.current) {
                    handleRef.current.style.transform = `translate3d(${metrics.handleX_0}px, 0, 0)`;
                    handleRef.current.style.opacity = "1";
                }
                if (overlayRef.current) overlayRef.current.style.opacity = "1";

                if (scrollerRef.current && spacerRef.current) {
                    spacerRef.current.style.width = `${getUncalibratedSpacerWidth(metrics)}px`;
                    scrollerRef.current.scrollLeft = 0;
                }
                if (visualContentRef.current) {
                    currentVisualScrollRef.current = metrics.centeredScrollLeft;
                    visualContentRef.current.style.transform = `translate3d(${-metrics.centeredScrollLeft}px, 0, 0)`;
                }
            } else {
                if (!isUnlockedRef.current && !isCollapsingRef.current && handleRef.current) {
                    handleRef.current.style.transform = `translate3d(${metrics.handleX_0}px, 0, 0)`;
                }
            }
        }
    };

    React.useEffect(() => {
        globalSelectedIdRef.current = selectedId;
        setLocalSelectedId(selectedId);
        localSelectedIdRef.current = selectedId;

        const metrics = recalculateMetrics();
        updateMetricsForSelectedId(selectedId);

        if (!isWideModeRef.current && !isUnlockedRef.current && !isCollapsingRef.current) {
            if (handleRef.current) {
                handleRef.current.style.transform = `translate3d(${metricsRef.current.handleX_0}px, 0, 0)`;
            }
            if (spacerRef.current) {
                spacerRef.current.style.width = `${getUncalibratedSpacerWidth(metricsRef.current)}px`;
            }
            if (visualContentRef.current) {
                currentVisualScrollRef.current = metricsRef.current.centeredScrollLeft;
                visualContentRef.current.style.transform = `translate3d(${-metricsRef.current.centeredScrollLeft}px, 0, 0)`;
            }
        } else if (isWideModeRef.current) {
            const matched = metrics.items.find((it) => it.id === selectedId);
            if (matched && scrollerRef.current) {
                scrollerRef.current.scrollTo({ left: matched.targetScroll, behavior: "smooth" });
            }
        }

        evaluateMode(metrics);
    }, [selectedId]);

    React.useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        const metrics = recalculateMetrics();
        evaluateMode(metrics);

        const ro = new ResizeObserver(() => {
            if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
            resizeRafRef.current = requestAnimationFrame(() => {
                const m = recalculateMetrics();
                evaluateMode(m);
            });
        });

        ro.observe(scroller);

        return () => {
            ro.disconnect();
            if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
        };
    }, [items]);

    const getClosestToCenterFast = (currentScrollX: number) => {
        const { containerW, items: cachedItems } = metricsRef.current;
        if (!cachedItems.length) return null;
        const centerPoint = currentScrollX + containerW / 2;
        let closestDist = Infinity;
        let closestItem = cachedItems[0];
        for (let i = 0; i < cachedItems.length; i++) {
            const dist = Math.abs(cachedItems[i].center - centerPoint);
            if (dist < closestDist) {
                closestDist = dist;
                closestItem = cachedItems[i];
            }
        }
        return closestItem;
    };

    const updateSelectionByScroll = (currentScrollX: number) => {
        const closest = getClosestToCenterFast(currentScrollX);
        if (closest?.id && closest.id !== localSelectedIdRef.current) {
            localSelectedIdRef.current = closest.id;
            setLocalSelectedId(closest.id);
        }
    };

    const startInactivityTimer = () => {
        clearInactivityTimer();
        if (isWideModeRef.current) return;
        if (!isUnlockedRef.current || isTouchingRef.current || isSnappingRef.current) return;
        inactivityTimeoutRef.current = setTimeout(() => {
            collapseAndTriggerGracePeriod();
        }, INACTIVITY_DELAY);
    };

    const collapseAndTriggerGracePeriod = () => {
        if (!isUnlockedRef.current || isTouchingRef.current || isSnappingRef.current || isWideModeRef.current) return;
        abortCollapseAnimation();

        updateMetricsForSelectedId(localSelectedIdRef.current);
        const { handleX_0, handleX_1, centeredScrollLeft } = metricsRef.current;

        setIsUnlocked(false);
        isUnlockedRef.current = false;
        isCalibratedStateRef.current = false;
        isCollapsingRef.current = true;

        if (handleRef.current) handleRef.current.style.opacity = "1";

        isProgrammaticSyncRef.current = true;
        if (scrollerRef.current && spacerRef.current) {
            spacerRef.current.style.width = `${getUncalibratedSpacerWidth(metricsRef.current)}px`;
            scrollerRef.current.scrollLeft = 0;
        }
        requestAnimationFrame(() => {
            isProgrammaticSyncRef.current = false;
        });

        if (visualContentRef.current) {
            currentVisualScrollRef.current = centeredScrollLeft;
            visualContentRef.current.style.transform = `translate3d(${-centeredScrollLeft}px, 0, 0)`;
        }

        const duration = 380;
        const startTime = performance.now();
        const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

        const step = (now: number) => {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = easeInOutCubic(t);
            const currentP = Math.max(0, 1 - eased);

            setProgress(currentP);
            if (handleRef.current) {
                handleRef.current.style.transform = `translate3d(${handleX_0 + (handleX_1 - handleX_0) * currentP}px, 0, 0)`;
            }
            if (overlayRef.current) {
                overlayRef.current.style.opacity = String(Math.max(0, 1 - currentP * 1.1));
            }

            if (t < 1) {
                collapseRafRef.current = requestAnimationFrame(step);
            } else {
                collapseRafRef.current = null;
                isCollapsingRef.current = false;
                setProgress(0);
                if (handleRef.current) {
                    handleRef.current.style.transform = `translate3d(${handleX_0}px, 0, 0)`;
                    handleRef.current.style.opacity = "1";
                }

                if (localSelectedIdRef.current === globalSelectedIdRef.current) {
                    setActionState("hidden");
                } else {
                    setActionState("pending_cancel");
                }
            }
        };
        collapseRafRef.current = requestAnimationFrame(step);
    };

    React.useEffect(() => {
        if (isWideMode) return;

        let t: NodeJS.Timeout;
        if (actionState === "pending_cancel") {
            t = setTimeout(() => setActionState("cancel"), 500);
        } else if (actionState === "cancel") {
            t = setTimeout(() => setActionState("confirm_pop"), 3000);
        } else if (actionState === "confirm_pop") {
            t = setTimeout(() => setActionState("confirm_exit"), 650);
        } else if (actionState === "confirm_exit") {
            t = setTimeout(() => {
                setActionState("hidden");
                const currentItems = itemsRef.current;
                const currentGetId = getItemIdRef.current;
                const finalItem = currentItems.find((item) => currentGetId(item) === localSelectedIdRef.current);
                if (finalItem) onSelectRef.current(finalItem);
                globalSelectedIdRef.current = localSelectedIdRef.current;
            }, 250);
        }

        return () => clearTimeout(t);
    }, [actionState, isWideMode]);

    const handleCancelAction = () => {
        setActionState("hidden");
        const originalId = globalSelectedIdRef.current;
        setLocalSelectedId(originalId);
        localSelectedIdRef.current = originalId;

        updateMetricsForSelectedId(originalId);

        const visual = visualContentRef.current;
        const targetScroll = metricsRef.current.centeredScrollLeft;

        if (handleRef.current) {
            handleRef.current.style.transform = `translate3d(${metricsRef.current.handleX_0}px, 0, 0)`;
        }
        if (spacerRef.current) {
            spacerRef.current.style.width = `${getUncalibratedSpacerWidth(metricsRef.current)}px`;
        }

        if (visual) {
            currentVisualScrollRef.current = targetScroll;
            visual.style.transition = "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)";
            visual.style.transform = `translate3d(${-targetScroll}px, 0, 0)`;

            setTimeout(() => {
                if (visual) visual.style.transition = "";
            }, 350);
        }
    };

    const attemptSnap = () => {
        if (isTouchingRef.current || isSnappingRef.current || isCollapsingRef.current || actionStateRef.current !== "hidden")
            return;
        const scroller = scrollerRef.current;
        if (!scroller) return;

        const { threshold } = metricsRef.current;
        const scrollLeft = scroller.scrollLeft;

        if (!isUnlockedRef.current && !isWideModeRef.current) {
            if (scrollLeft > 0 && scrollLeft < threshold - SUBPIXEL_EPSILON) {
                isSnappingRef.current = true;
                scroller.scrollTo({ left: scrollLeft > threshold / 2 ? threshold : 0, behavior: "smooth" });
            }
            return;
        }

        if (!isCalibratedStateRef.current) {
            calibrateToNativeScroll();
            requestAnimationFrame(() => {
                if (!isTouchingRef.current && !isCollapsingRef.current && (isUnlockedRef.current || isWideModeRef.current)) {
                    attemptSnap();
                }
            });
            return;
        }

        const closest = getClosestToCenterFast(scroller.scrollLeft);
        if (closest) {
            if (closest.id && closest.id !== localSelectedIdRef.current) {
                localSelectedIdRef.current = closest.id;
                setLocalSelectedId(closest.id);
            }

            if (isWideModeRef.current) {
                if (closest.id !== globalSelectedIdRef.current) {
                    globalSelectedIdRef.current = closest.id;
                    const currentItems = itemsRef.current;
                    const currentGetId = getItemIdRef.current;
                    const finalItem = currentItems.find((item) => currentGetId(item) === closest.id);
                    if (finalItem) onSelectRef.current(finalItem);
                }
            }

            if (Math.abs(scroller.scrollLeft - closest.targetScroll) > 1) {
                isSnappingRef.current = true;
                if (snappingSafetyTimeoutRef.current) clearTimeout(snappingSafetyTimeoutRef.current);
                snappingSafetyTimeoutRef.current = setTimeout(() => {
                    isSnappingRef.current = false;
                    startInactivityTimer();
                }, 450);
                scroller.scrollTo({ left: closest.targetScroll, behavior: "smooth" });
            } else {
                startInactivityTimer();
            }
        }
    };

    const handleScroll = () => {
        if (isProgrammaticSyncRef.current) return;
        lastScrollTimeRef.current = Date.now();
        clearInactivityTimer();

        const scroller = scrollerRef.current;
        const visual = visualContentRef.current;
        if (!scroller || !visual) return;
        const scrollLeft = scroller.scrollLeft;
        const { containerW, maxScroll, threshold, centeredScrollLeft } = metricsRef.current;

        if (isCalibratedStateRef.current || isWideModeRef.current) {
            let visualX = -scrollLeft;
            if (scrollLeft < 0) visualX = applyRubberBand(-scrollLeft, containerW);
            else if (scrollLeft > maxScroll) visualX = -(maxScroll + applyRubberBand(scrollLeft - maxScroll, containerW));

            currentVisualScrollRef.current = scrollLeft;
            visual.style.transform = `translate3d(${visualX}px, 0, 0)`;
            updateSelectionByScroll(scrollLeft);
            if (!isSnappingRef.current) scheduleSnapCheck();
            return;
        }

        // Чистая проверка с субпиксельным допуском: порог пройден, если scrollLeft подошел вплотную
        if (!isUnlockedRef.current && scrollLeft < threshold - SUBPIXEL_EPSILON) {
            setProgress(Math.max(0, Math.min(scrollLeft / threshold, 1)));
            if (!isSnappingRef.current) scheduleSnapCheck();
            return;
        }

        if (!isUnlockedRef.current) {
            isUnlockedRef.current = true;
            setIsUnlocked(true);
            if (handleRef.current) handleRef.current.style.opacity = "0";
            if (overlayRef.current) overlayRef.current.style.opacity = "0";
            setProgress(1);
        }

        const rawVisualScroll = centeredScrollLeft + scrollLeft - threshold;
        currentVisualScrollRef.current = rawVisualScroll;

        let visualX = -rawVisualScroll;
        if (rawVisualScroll < 0) visualX = applyRubberBand(-rawVisualScroll, containerW);
        else if (rawVisualScroll > maxScroll) visualX = -(maxScroll + applyRubberBand(rawVisualScroll - maxScroll, containerW));

        visual.style.transform = `translate3d(${visualX}px, 0, 0)`;
        updateSelectionByScroll(rawVisualScroll);
        if (!isSnappingRef.current) scheduleSnapCheck();
    };

    const scheduleSnapCheck = () => {
        if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
        scrollEndTimeoutRef.current = setTimeout(attemptSnap, 140);
    };

    React.useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        const swipeStartRef = { current: null as { x: number; time: number } | null };

        const abortInteractions = () => {
            clearInactivityTimer();
            isSnappingRef.current = false;
            if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
            if (snappingSafetyTimeoutRef.current) clearTimeout(snappingSafetyTimeoutRef.current);

            if (isCollapsingRef.current) {
                abortCollapseAnimation();
                setProgress(0);
                if (handleRef.current) {
                    handleRef.current.style.transform = `translate3d(${metricsRef.current.handleX_0}px, 0, 0)`;
                    handleRef.current.style.opacity = "1";
                }
                if (overlayRef.current) overlayRef.current.style.opacity = "1";
                scroller.scrollTo({ left: 0, behavior: "auto" });
                return;
            }
            if (isUnlockedRef.current && !isCalibratedStateRef.current) {
                calibrateToNativeScroll();
                return;
            }

            scroller.scrollTo({ left: scroller.scrollLeft, behavior: "auto" });
            if (isCalibratedStateRef.current) currentVisualScrollRef.current = scroller.scrollLeft;
        };

        const onStart = (e: Event) => {
            const touch = (e as TouchEvent).touches?.[0] || (e as MouseEvent);
            swipeStartRef.current = { x: touch.clientX, time: Date.now() };
            isTouchingRef.current = true;
            abortInteractions();
        };

        const onMove = (e: Event) => {
            if (!swipeStartRef.current || isWideModeRef.current) return;
            if (actionStateRef.current === "cancel" || actionStateRef.current === "pending_cancel") {
                const touch = (e as TouchEvent).touches?.[0] || (e as MouseEvent);
                const deltaX = touch.clientX - swipeStartRef.current.x;

                if (deltaX > 15) {
                    swipeStartRef.current = null;
                    setActionState("confirm_pop");
                    e.preventDefault();
                } else if (deltaX < -15) {
                    swipeStartRef.current = null;
                    setActionState("hidden");
                    setIsUnlocked(true);
                    isUnlockedRef.current = true;
                    isCalibratedStateRef.current = false;
                    if (handleRef.current) handleRef.current.style.opacity = "0";
                    if (overlayRef.current) overlayRef.current.style.opacity = "0";
                    setProgress(1);
                }
            }
        };

        const onEnd = (e: Event) => {
            if ((e as TouchEvent).touches?.length > 0) return;
            swipeStartRef.current = null;
            isTouchingRef.current = false;
            if (Date.now() - lastScrollTimeRef.current >= 60) attemptSnap();
        };

        scroller.addEventListener("touchstart", onStart, { passive: true });
        scroller.addEventListener("touchmove", onMove, { passive: false });
        scroller.addEventListener("mousedown", onStart);
        window.addEventListener("touchend", onEnd, { passive: true });
        window.addEventListener("mouseup", onEnd);
        scroller.addEventListener("scrollend", () => {
            if (isProgrammaticSyncRef.current) return;
            isSnappingRef.current = false;
            if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
            attemptSnap();
        });

        return () => {
            scroller.removeEventListener("touchstart", onStart);
            scroller.removeEventListener("touchmove", onMove);
            scroller.removeEventListener("mousedown", onStart);
            window.removeEventListener("touchend", onEnd);
            window.removeEventListener("mouseup", onEnd);
            clearInactivityTimer();
            abortCollapseAnimation();
        };
    }, []);

    React.useLayoutEffect(() => {
        if (isCollapsingRef.current || actionState !== "hidden" || isWideMode) return;
        const { handleX_0, handleX_1, centeredScrollLeft } = metricsRef.current;
        if (overlayRef.current) overlayRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.1));
        if (handleRef.current) {
            handleRef.current.style.transform = `translate3d(${handleX_0 + (handleX_1 - handleX_0) * progress}px, 0, 0)`;
            handleRef.current.style.opacity = progress >= 1 ? "0" : "1";
        }
        if (!isUnlockedRef.current && visualContentRef.current) {
            currentVisualScrollRef.current = centeredScrollLeft;
            visualContentRef.current.style.transform = `translate3d(${-centeredScrollLeft}px, 0, 0)`;
        }
    }, [progress, actionState, isWideMode]);

    const selectedLocalItem = items.find((it) => getItemId(it) === localSelectedId) || items[0];
    const springTransition = "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";

    const isPillShifted = actionState === "cancel";
    const isCancelActive = actionState === "cancel";
    const isGreenActive = actionState === "confirm_pop";
    const isHandleElevated =
        actionState === "cancel" ||
        actionState === "confirm_pop" ||
        actionState === "confirm_exit";

    const handleItemClick = (item: T) => {
        const id = getItemId(item);
        setLocalSelectedId(id);
        localSelectedIdRef.current = id;
        globalSelectedIdRef.current = id;
        onSelectRef.current(item);

        const matched = metricsRef.current.items.find((it) => it.id === id);
        if (matched && scrollerRef.current) {
            scrollerRef.current.scrollTo({ left: matched.targetScroll, behavior: "smooth" });
        }
    };

    return (
        <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
            <style jsx>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

            {/* СЛОЙ 1: Список элементов */}
            <div
                ref={pickerWrapperRef}
                className={`w-full h-full flex items-center transition-opacity duration-200 ease-out ${
                    isUnlocked || isWideMode ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
                <div ref={visualContentRef} className="flex items-center gap-3 px-4 w-max will-change-transform">
                    {items.map((item) => {
                        const id = getItemId(item);
                        return (
                            <div
                                key={id}
                                onClick={() => handleItemClick(item)}
                                style={{ opacity: id === localSelectedId && progress < 1 && !isWideMode ? 0 : 1 }}
                            >
                                {renderItem(item, 1)}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* СЛОЙ 2: Контент строки */}
            <div
                ref={overlayRef}
                className={`absolute inset-0 z-10 pointer-events-none flex items-center px-4 transition-opacity duration-150 ${
                    isWideMode ? "opacity-0" : "opacity-100"
                }`}
            >
                {overlay}
            </div>

            {/* СЛОЙ 3: Handle (скрыт в режиме широкого элемента) */}
            <div
                ref={handleRef}
                className={`absolute inset-y-0 left-0 flex items-center will-change-transform pointer-events-none ${
                    isWideMode ? "opacity-0" : ""
                } ${isHandleElevated ? "z-40" : "z-20"}`}
            >
                <div className="relative flex items-center">
                    {/* ЗЕЛЕНАЯ ГАЛКА */}
                    <div
                        className="absolute left-0 flex items-center justify-center pointer-events-none"
                        style={{
                            width: 44,
                            height: 44,
                            zIndex: 1,
                            transition: springTransition,
                            opacity: isGreenActive ? 1 : 0,
                            transform: isGreenActive
                                ? "translate3d(-48px, 0, 0) scale(0.707)"
                                : "translate3d(0, 0, 0) scale(0.1)",
                        }}
                    >
                        <div
                            className="w-full h-full rounded-full flex items-center justify-center"
                            style={{
                                backgroundColor: "#22c55e",
                                boxShadow: "0 2px 10px rgba(34,197,94,0.45)",
                            }}
                        >
                            <Check size={22} color="white" strokeWidth={3} />
                        </div>
                    </div>

                    {/* ПЛАШКА / МИНИАТЮРА */}
                    <div
                        ref={pillWrapperRef}
                        className="shrink-0 will-change-transform pointer-events-none"
                        style={{
                            position: "relative",
                            zIndex: 2,
                            transition: springTransition,
                            transform: isPillShifted ? "translate3d(-52px, 0, 0)" : "translate3d(0, 0, 0)",
                        }}
                    >
                        {renderItem(selectedLocalItem, progress)}
                    </div>

                    {/* КРАСНЫЙ КРЕСТИК ОТМЕНЫ */}
                    <div
                        className="absolute right-0 flex items-center justify-center pointer-events-auto"
                        style={{
                            width: 44,
                            height: 44,
                            zIndex: 1,
                            transition: springTransition,
                            opacity: isCancelActive ? 1 : 0,
                            transform: isCancelActive
                                ? "translate3d(0, 0, 0) scale(0.707)"
                                : "translate3d(-20px, 0, 0) scale(0.1)",
                            pointerEvents: isCancelActive ? "auto" : "none",
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (actionState === "cancel") handleCancelAction();
                            }}
                            disabled={actionState !== "cancel"}
                            className="relative w-full h-full rounded-full flex items-center justify-center outline-none cursor-pointer"
                            style={{
                                backgroundColor: "#ef4444",
                                boxShadow: "0 2px 8px rgba(239,68,68,0.4)",
                            }}
                        >
                            <X size={22} color="white" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            {/* СЛОЙ 4: Привод скролла */}
            <div
                ref={scrollerRef}
                onScroll={handleScroll}
                className="no-scrollbar absolute inset-0 z-30 overflow-x-auto touch-pan-x cursor-pointer"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <div ref={spacerRef} className="pointer-events-none h-full" />
            </div>
        </div>
    );
}