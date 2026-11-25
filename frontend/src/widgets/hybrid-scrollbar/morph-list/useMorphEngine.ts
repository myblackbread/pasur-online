'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import type { MorphAnchorConfig, MorphDirection, MorphItemBase } from './types';

interface UseMorphEngineProps<T extends MorphItemBase> {
    anchor?: MorphAnchorConfig;
    items?: T[];
    direction?: MorphDirection;
    spacing?: number;
    paddingHorizontal?: number;
    paddingTop?: number;
    paddingBottom?: number;
    estimatedItemHeight?: number;
}

const findFirstVisibleIndex = (offsets: Float64Array, targetY: number): number => {
    let low = 0;
    let high = offsets.length - 2;
    let result = 0;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (offsets[mid + 1] >= targetY) {
            result = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return result;
};

export const useMorphEngine = <T extends MorphItemBase>({
    anchor,
    items = [],
    direction,
    spacing = 12,
    paddingHorizontal = 16,
    paddingTop = 16,
    paddingBottom = 16,
    estimatedItemHeight = 140,
}: UseMorphEngineProps<T>) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContentRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<Map<string | number, HTMLDivElement>>(new Map());

    const heightsMap = useRef<Map<string | number, number>>(new Map());
    const offsetsRef = useRef<Float64Array>(new Float64Array(0));
    const savedScrollTop = useRef(0);
    const isMeasured = useRef(false);
    const prevRunwayRef = useRef(0);
    const isInitialPositionAppliedRef = useRef(false);

    const rangeRef = useRef({ startIndex: 0, endIndex: -1 });
    const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: -1 });

    const resolvedDirection = direction ?? anchor?.direction ?? 'bottom';
    const isTop = resolvedDirection === 'top' || resolvedDirection === 'from-top';

    const buildOffsets = useCallback(() => {
        const count = items.length;
        const offsets = new Float64Array(count + 1);
        const basePadding = isTop ? paddingBottom : paddingTop;
        offsets[0] = basePadding;

        for (let i = 0; i < count; i++) {
            const id = items[i].id;
            const h = heightsMap.current.get(id) || estimatedItemHeight;
            offsets[i + 1] = offsets[i] + h + spacing;
        }

        offsetsRef.current = offsets;

        if (scrollContentRef.current && anchor) {
            const lastCardOffset = count > 0 ? offsets[count] - spacing : basePadding;
            const containerHeight = containerRef.current ? containerRef.current.clientHeight : 600;

            if (isTop) {
                const totalContentHeight = lastCardOffset + paddingTop;
                const runway = Math.max(containerHeight, totalContentHeight);
                scrollContentRef.current.style.height = `${runway}px`;
            } else {
                const requiredRunway = (anchor.bottom ?? 0) + anchor.height + spacing + paddingBottom;
                scrollContentRef.current.style.height = `${lastCardOffset + requiredRunway}px`;
            }
        }
    }, [items, paddingTop, spacing, estimatedItemHeight, anchor, paddingBottom, isTop]);

    const calculateMorphing = useCallback(() => {
        if (!anchor || !containerRef.current || !scrollContentRef.current || items.length === 0) return;

        const container = containerRef.current;
        const scrollTop = container.scrollTop;
        const offsets = offsetsRef.current;
        const count = items.length;

        if (offsets.length !== count + 1) {
            buildOffsets();
        }

        const W = container.clientWidth;
        const H = container.clientHeight;

        const anchorRight = anchor.right ?? 16;
        const anchorRect = {
            minX: W - anchorRight - anchor.width,
            maxX: W - anchorRight,
            minY: isTop ? (anchor.top ?? 0) : H - (anchor.bottom ?? 0) - anchor.height,
            maxY: isTop ? (anchor.top ?? 0) + anchor.height : H - (anchor.bottom ?? 0),
            width: anchor.width,
            height: anchor.height
        };

        const influenceRect = {
            minX: anchorRect.minX - spacing,
            maxX: anchorRect.maxX + spacing,
            minY: anchorRect.minY - spacing,
            maxY: anchorRect.maxY + spacing,
            width: anchorRect.width + spacing * 2,
            height: anchorRect.height + spacing * 2
        };

        const collapsedH = anchorRect.height;
        const verticalRadius = influenceRect.height / 2;
        const influenceMidY = influenceRect.minY + verticalRadius;

        let newStartIndex = 0;
        let newEndIndex = count - 1;

        if (isTop) {
            // =========================================================
            // РЕЖИМ TOP: Сообщения растут СНИЗУ ВВЕРХ к верхнему якорю
            // =========================================================
            const lastCardOffset = count > 0 ? offsets[count] - spacing : offsets[0];
            const totalContentHeight = lastCardOffset + paddingTop;
            const runway = Math.max(H, totalContentHeight);

            // Автоматическое удержание скролла внизу при первичной загрузке или добавлении сообщений
            const maxScroll = Math.max(0, runway - H);
            if (!isInitialPositionAppliedRef.current && H > 0) {
                container.scrollTop = maxScroll;
                savedScrollTop.current = maxScroll;
                isInitialPositionAppliedRef.current = true;
            } else if (isInitialPositionAppliedRef.current) {
                const prevMax = Math.max(0, prevRunwayRef.current - H);
                const wasAtBottom = Math.abs(scrollTop - prevMax) < 60;
                if (wasAtBottom && Math.abs(maxScroll - prevMax) > 1) {
                    container.scrollTop = maxScroll;
                    savedScrollTop.current = maxScroll;
                }
            }
            prevRunwayRef.current = runway;

            const currentScrollTop = container.scrollTop;

            // 1. Поиск среза виртуализации
            let currentBottomScreenY = runway - offsets[0] - currentScrollTop;
            let activeIndex = -1;
            let foundStart = false;

            for (let i = 0; i < count; i++) {
                const id = items[i].id;
                const targetHeight = heightsMap.current.get(id) || estimatedItemHeight;
                const naturalCardMinY = currentBottomScreenY - targetHeight;

                let calculatedHeight = collapsedH;
                let expandProgress = 0;

                if (activeIndex === -1) {
                    if (naturalCardMinY > influenceRect.maxY) {
                        expandProgress = 1;
                        calculatedHeight = targetHeight;
                    } else {
                        activeIndex = i;
                        const travelDistance = Math.max(0, influenceRect.maxY - naturalCardMinY);
                        const maxExpansion = Math.max(0, targetHeight - collapsedH);
                        expandProgress = maxExpansion > 0 ? Math.max(0, Math.min(1, 1 - travelDistance / maxExpansion)) : 0;
                        calculatedHeight = collapsedH + maxExpansion * expandProgress;
                    }
                } else {
                    expandProgress = 0;
                    calculatedHeight = collapsedH;
                }

                const cardMinY = currentBottomScreenY - calculatedHeight;
                const cardBottomY = currentBottomScreenY;

                // Отсечение снизу экрана
                if (cardMinY > H + 150) {
                    newStartIndex = i + 1;
                } else if (!foundStart) {
                    newStartIndex = Math.max(0, i - 1);
                    foundStart = true;
                }

                const appearanceProgress = Math.min(1, Math.max(0, (cardBottomY - anchorRect.minY) / collapsedH));
                if (appearanceProgress <= 0 && activeIndex !== -1 && i > activeIndex + 1) {
                    newEndIndex = Math.min(count - 1, i + 1);
                    break;
                }

                currentBottomScreenY = cardMinY - spacing;
            }

            if (newStartIndex !== rangeRef.current.startIndex || newEndIndex !== rangeRef.current.endIndex) {
                rangeRef.current = { startIndex: newStartIndex, endIndex: newEndIndex };
                setVisibleRange({ startIndex: newStartIndex, endIndex: newEndIndex });
            }

            // 2. Точная стилизация смонтированных DOM-нод
            currentBottomScreenY = runway - offsets[0] - currentScrollTop;
            activeIndex = -1;

            for (let i = 0; i <= newEndIndex; i++) {
                const item = items[i];
                const id = item.id;
                const card = cardsRef.current.get(id);
                const targetHeight = heightsMap.current.get(id) || estimatedItemHeight;
                const naturalCardMinY = currentBottomScreenY - targetHeight;

                let calculatedHeight = collapsedH;
                let expandProgress = 0;

                if (activeIndex === -1) {
                    if (naturalCardMinY > influenceRect.maxY) {
                        expandProgress = 1;
                        calculatedHeight = targetHeight;
                    } else {
                        activeIndex = i;
                        const travelDistance = Math.max(0, influenceRect.maxY - naturalCardMinY);
                        const maxExpansion = Math.max(0, targetHeight - collapsedH);
                        expandProgress = maxExpansion > 0 ? Math.max(0, Math.min(1, 1 - travelDistance / maxExpansion)) : 0;
                        calculatedHeight = collapsedH + maxExpansion * expandProgress;
                    }
                } else {
                    expandProgress = 0;
                    calculatedHeight = collapsedH;
                }

                const cardMinY = currentBottomScreenY - calculatedHeight;
                const cardBottomY = currentBottomScreenY;

                if (i >= newStartIndex && card) {
                    const clampedY = Math.min(Math.max(influenceMidY, cardMinY), cardBottomY);
                    const dy = Math.abs(clampedY - influenceMidY);

                    const normalCardRightEdge = W - paddingHorizontal;
                    const maxNeededIndent = Math.max(0, normalCardRightEdge - influenceRect.minX);

                    let rightIndent = 0;
                    if (cardMinY < influenceRect.maxY && cardBottomY > influenceRect.minY) {
                        if (dy < verticalRadius) {
                            const normY = dy / verticalRadius;
                            const cutProgress = Math.sqrt(Math.max(0, 1 - normY * normY));
                            rightIndent = maxNeededIndent * cutProgress;
                        } else {
                            rightIndent = 0;
                        }
                    }

                    const appearanceProgress = Math.min(1, Math.max(0, (cardBottomY - anchorRect.minY) / collapsedH));
                    const stackOffsetY = Math.max(0, anchorRect.minY - cardMinY);
                    const scale = 0.9 + 0.1 * appearanceProgress;

                    const finalW = W - paddingHorizontal * 2;
                    const initialW = finalW - maxNeededIndent;
                    const currentW = finalW - rightIndent;
                    const currentH = calculatedHeight;
                    const screenY = cardMinY + stackOffsetY;

                    card.style.position = 'absolute';
                    card.style.top = '0px';
                    card.style.left = `${paddingHorizontal}px`;
                    card.style.right = `${paddingHorizontal + rightIndent}px`;
                    card.style.height = `${currentH}px`;
                    card.style.zIndex = String(count - i);
                    card.style.transform = `translate3d(0, ${screenY}px, 0) scale(${scale})`;
                    card.style.transformOrigin = 'center top';
                    card.style.opacity = `${appearanceProgress}`;

                    card.style.setProperty('--morph-progress', String(expandProgress));
                    card.style.setProperty('--morph-initial-w', `${initialW}px`);
                    card.style.setProperty('--morph-initial-h', `${collapsedH}px`);
                    card.style.setProperty('--morph-final-w', `${finalW}px`);
                    card.style.setProperty('--morph-final-h', `${targetHeight}px`);
                    card.style.setProperty('--morph-current-w', `${currentW}px`);
                    card.style.setProperty('--morph-current-h', `${currentH}px`);
                }

                currentBottomScreenY = cardMinY - spacing;
            }

        } else {
            // =========================================================
            // РЕЖИМ BOTTOM: Сообщения растут СВЕРХУ ВНИЗ к нижнему якорю
            // =========================================================
            const rawStart = findFirstVisibleIndex(offsets, Math.max(0, scrollTop - 300));
            newStartIndex = Math.max(0, rawStart - 2);

            let activeIndex = -1;
            let currentLayoutY = offsets[newStartIndex];
            newEndIndex = count - 1;

            for (let i = newStartIndex; i < count; i++) {
                const id = items[i].id;
                const targetHeight = heightsMap.current.get(id) || estimatedItemHeight;

                let calculatedHeight = collapsedH;
                let expandProgress = 0;

                if (activeIndex === -1) {
                    currentLayoutY = offsets[i];
                    const cardMinY = currentLayoutY - scrollTop;
                    const cardBottomY = cardMinY + collapsedH;
                    const maxExpansion = Math.max(0, targetHeight - collapsedH);
                    const travelDistance = Math.max(0, influenceRect.minY - cardBottomY);

                    expandProgress = maxExpansion > 0 ? Math.min(travelDistance / maxExpansion, 1) : 0;

                    if (expandProgress < 1) {
                        activeIndex = i;
                        calculatedHeight = collapsedH + maxExpansion * expandProgress;
                    } else {
                        calculatedHeight = targetHeight;
                    }
                } else {
                    expandProgress = 0;
                    calculatedHeight = collapsedH;
                }

                const cardMinY = currentLayoutY - scrollTop;
                const appearanceProgress = Math.min(1, Math.max(0, (anchorRect.maxY - cardMinY) / collapsedH));

                if (appearanceProgress <= 0 && i > activeIndex + 1) {
                    newEndIndex = Math.min(count - 1, i);
                    break;
                }

                currentLayoutY += calculatedHeight + spacing;
            }

            if (newStartIndex !== rangeRef.current.startIndex || newEndIndex !== rangeRef.current.endIndex) {
                rangeRef.current = { startIndex: newStartIndex, endIndex: newEndIndex };
                setVisibleRange({ startIndex: newStartIndex, endIndex: newEndIndex });
            }

            let layoutY = offsets[newStartIndex];
            activeIndex = -1;

            for (let i = newStartIndex; i <= newEndIndex; i++) {
                const item = items[i];
                const id = item.id;
                const card = cardsRef.current.get(id);
                const targetHeight = heightsMap.current.get(id) || estimatedItemHeight;

                let calculatedHeight = collapsedH;
                let expandProgress = 0;

                if (activeIndex === -1) {
                    layoutY = offsets[i];
                    const cardMinY = layoutY - scrollTop;
                    const cardBottomY = cardMinY + collapsedH;
                    const maxExpansion = Math.max(0, targetHeight - collapsedH);
                    const travelDistance = Math.max(0, influenceRect.minY - cardBottomY);

                    expandProgress = maxExpansion > 0 ? Math.min(travelDistance / maxExpansion, 1) : 0;

                    if (expandProgress < 1) {
                        activeIndex = i;
                        calculatedHeight = collapsedH + maxExpansion * expandProgress;
                    } else {
                        calculatedHeight = targetHeight;
                    }
                } else {
                    expandProgress = 0;
                    calculatedHeight = collapsedH;
                }

                const cardMinY = layoutY - scrollTop;
                const cardBottomY = cardMinY + collapsedH;

                const clampedY = Math.min(Math.max(influenceMidY, cardMinY), cardBottomY);
                const signedY = clampedY - influenceMidY;

                const normalCardRightEdge = W - paddingHorizontal;
                const maxNeededIndent = Math.max(0, normalCardRightEdge - influenceRect.minX);

                let rightIndent = 0;
                if (signedY >= 0) {
                    rightIndent = maxNeededIndent;
                } else {
                    const dy = -signedY;
                    if (dy < verticalRadius) {
                        const normY = dy / verticalRadius;
                        const cutProgress = Math.sqrt(Math.max(0, 1 - normY * normY));
                        rightIndent = maxNeededIndent * cutProgress;
                    } else {
                        rightIndent = 0;
                    }
                }

                const appearanceProgress = Math.min(1, Math.max(0, (anchorRect.maxY - cardMinY) / collapsedH));
                const stackOffsetY = Math.min(0, anchorRect.maxY - cardBottomY);
                const scale = 0.9 + 0.1 * appearanceProgress;

                const finalW = W - paddingHorizontal * 2;
                const initialW = finalW - maxNeededIndent;
                const currentW = finalW - rightIndent;
                const currentH = calculatedHeight;
                const screenY = cardMinY + stackOffsetY;

                if (card) {
                    card.style.position = 'absolute';
                    card.style.top = '0px';
                    card.style.left = `${paddingHorizontal}px`;
                    card.style.right = `${paddingHorizontal + rightIndent}px`;
                    card.style.height = `${currentH}px`;
                    card.style.zIndex = String(count - i);
                    card.style.transform = `translate3d(0, ${screenY}px, 0) scale(${scale})`;
                    card.style.transformOrigin = 'center bottom';
                    card.style.opacity = `${appearanceProgress}`;

                    card.style.setProperty('--morph-progress', String(expandProgress));
                    card.style.setProperty('--morph-initial-w', `${initialW}px`);
                    card.style.setProperty('--morph-initial-h', `${collapsedH}px`);
                    card.style.setProperty('--morph-final-w', `${finalW}px`);
                    card.style.setProperty('--morph-final-h', `${targetHeight}px`);
                    card.style.setProperty('--morph-current-w', `${currentW}px`);
                    card.style.setProperty('--morph-current-h', `${currentH}px`);
                }

                layoutY += calculatedHeight + spacing;
            }
        }
    }, [anchor, items, spacing, paddingHorizontal, paddingBottom, estimatedItemHeight, buildOffsets, isTop]);

    useEffect(() => {
        buildOffsets();
        const count = items.length;
        const initialEnd = count > 0 ? Math.min(count - 1, 14) : -1;
        rangeRef.current = { startIndex: 0, endIndex: initialEnd };
        setVisibleRange({ startIndex: 0, endIndex: initialEnd });
    }, [items, buildOffsets]);

    useEffect(() => {
        if (!anchor) return;

        const ro = new ResizeObserver((entries) => {
            let changed = false;
            for (const entry of entries) {
                const el = entry.target as HTMLElement;
                const id = el.dataset.morphId;
                if (!id) continue;

                const newHeight = el.offsetHeight;
                if (newHeight > 0 && heightsMap.current.get(id) !== newHeight) {
                    heightsMap.current.set(id, newHeight);
                    changed = true;
                }
            }

            if (changed || !isMeasured.current) {
                isMeasured.current = true;
                buildOffsets();
                calculateMorphing();
            }
        });

        cardsRef.current.forEach((card) => {
            if (card && card.firstElementChild) {
                ro.observe(card.firstElementChild);
            }
        });

        return () => ro.disconnect();
    }, [visibleRange, anchor, buildOffsets, calculateMorphing]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !anchor) return;

        container.scrollTop = savedScrollTop.current;
        calculateMorphing();

        const handleScroll = () => {
            savedScrollTop.current = container.scrollTop;
            calculateMorphing();
        };

        const handleResize = () => {
            buildOffsets();
            calculateMorphing();
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);

        return () => {
            container.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, [calculateMorphing, buildOffsets, anchor]);

    const visibleItems = useMemo(() => {
        if (visibleRange.endIndex < visibleRange.startIndex || items.length === 0) {
            return [];
        }
        return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
    }, [items, visibleRange]);

    return {
        containerRef,
        scrollContentRef,
        cardsRef,
        visibleItems,
        visibleRange,
        calculateMorphing
    };
};