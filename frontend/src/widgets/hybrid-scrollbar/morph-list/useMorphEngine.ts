'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import type { MorphAnchorConfig, MorphItemBase } from './types';

interface UseMorphEngineProps<T extends MorphItemBase> {
    anchor?: MorphAnchorConfig;
    items?: T[];
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
    spacing = 12,
    paddingHorizontal = 16,
    paddingTop = 16,
    paddingBottom = 16,
    estimatedItemHeight = 140,
}: UseMorphEngineProps<T>) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContentRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<Map<string | number, HTMLDivElement>>(new Map());

    // Кэш фактических замеров высот по стабильному id
    const heightsMap = useRef<Map<string | number, number>>(new Map());
    const offsetsRef = useRef<Float64Array>(new Float64Array(0));
    const savedScrollTop = useRef(0);
    const isMeasured = useRef(false);

    // Диапазон отображаемых в DOM элементов
    const rangeRef = useRef({ startIndex: 0, endIndex: -1 });
    const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: -1 });

    // Пересчет кумулятивных смещений всех элементов
    const buildOffsets = useCallback(() => {
        const count = items.length;
        const offsets = new Float64Array(count + 1);
        offsets[0] = paddingTop;

        for (let i = 0; i < count; i++) {
            const id = items[i].id;
            const h = heightsMap.current.get(id) || estimatedItemHeight;
            offsets[i + 1] = offsets[i] + h + spacing;
        }

        offsetsRef.current = offsets;

        if (scrollContentRef.current && anchor) {
            const lastCardBottom = count > 0 ? offsets[count] - spacing : paddingTop;
            const requiredRunway = anchor.bottom + anchor.height + spacing + paddingBottom;
            scrollContentRef.current.style.height = `${lastCardBottom + requiredRunway}px`;
        }
    }, [items, paddingTop, spacing, estimatedItemHeight, anchor, paddingBottom]);

    const calculateMorphing = useCallback(() => {
        if (!anchor || !containerRef.current || !scrollContentRef.current || items.length === 0) return;

        const container = containerRef.current;
        const scrollTop = container.scrollTop;
        const offsets = offsetsRef.current;

        if (offsets.length !== items.length + 1) {
            buildOffsets();
        }

        const W = container.clientWidth;
        const H = container.clientHeight;

        const anchorRect = {
            minX: W - anchor.right - anchor.width,
            maxX: W - anchor.right,
            minY: H - anchor.bottom - anchor.height,
            maxY: H - anchor.bottom,
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

        // 1. Быстрый бинарный поиск верхней границы (с буфером 300px)
        const rawStart = findFirstVisibleIndex(offsets, Math.max(0, scrollTop - 300));
        const newStartIndex = Math.max(0, rawStart - 2);

        let activeIndex = -1;
        let currentLayoutY = offsets[newStartIndex];
        let newEndIndex = items.length - 1;

        // 2. Локальный прогон только по потенциально видимой зоне
        for (let i = newStartIndex; i < items.length; i++) {
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

            // Если карточка ушла полностью под якорь (opacity = 0), берем 2 карточки запаса и прерываем срез
            if (appearanceProgress <= 0 && i > activeIndex + 1) {
                newEndIndex = Math.min(items.length - 1, i);
                break;
            }

            currentLayoutY += calculatedHeight + spacing;
        }

        // 3. Обновляем окно виртуализации при смене индексов
        if (newStartIndex !== rangeRef.current.startIndex || newEndIndex !== rangeRef.current.endIndex) {
            rangeRef.current = { startIndex: newStartIndex, endIndex: newEndIndex };
            setVisibleRange({ startIndex: newStartIndex, endIndex: newEndIndex });
        }

        // 4. Стилизуем строго смонтированные ноды текущего окна
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
                card.style.zIndex = String(items.length - i);
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
    }, [anchor, items, spacing, paddingHorizontal, paddingBottom, estimatedItemHeight, buildOffsets]);

    // Инициализация при смене входного списка данных
    useEffect(() => {
        buildOffsets();
        const count = items.length;
        const initialEnd = count > 0 ? Math.min(count - 1, 12) : -1;
        rangeRef.current = { startIndex: 0, endIndex: initialEnd };
        setVisibleRange({ startIndex: 0, endIndex: initialEnd });
    }, [items, buildOffsets]);

    // ResizeObserver наблюдает только за 10–15 элементами, смонтированными в DOM
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

    // Обработка нативного скролла
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

    // Виртуальный срез данных для рендера
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