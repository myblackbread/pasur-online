'use client';

import React, { forwardRef, useLayoutEffect } from 'react';
import { useMorphEngine } from './useMorphEngine';
import { useActiveMorphParams } from './MorphRegistry';
import type { MorphItemBase } from './types';

const MorphItem = forwardRef<HTMLDivElement, { 
  item: MorphItemBase; 
  renderItem: (item: any) => React.ReactNode 
}>(({ item, renderItem }, ref) => {
  return (
    <div
      ref={ref}
      className="overflow-hidden"
      style={{ willChange: 'transform, opacity' }}
    >
      <div 
        className="w-full h-max" 
        data-morph-id={String(item.id)}
      >
        {renderItem(item)}
      </div>
    </div>
  );
});
MorphItem.displayName = 'MorphItem';

export interface MorphHostProps<T extends MorphItemBase = MorphItemBase> {
  activeContractType: string;
  items: T[];
  paddingTop?: number;
  paddingBottom?: number;
  paddingHorizontal?: number;
  estimatedItemHeight?: number;
}

export const MorphHost = <T extends MorphItemBase>({ 
  activeContractType, 
  items,
  paddingTop = 16,
  paddingBottom = 16,
  paddingHorizontal = 16,
  estimatedItemHeight = 140
}: MorphHostProps<T>) => {
  const destination = useActiveMorphParams(activeContractType);
  
  const { 
    containerRef, 
    scrollContentRef, 
    cardsRef, 
    visibleItems,
    calculateMorphing 
  } = useMorphEngine({
    anchor: destination?.anchorConfig,
    items,
    paddingTop,
    paddingBottom,
    paddingHorizontal,
    estimatedItemHeight
  });

  // Моментальная стилизация нод перед paint-фазой браузера при смене среза
  useLayoutEffect(() => {
    calculateMorphing();
  }, [visibleItems, calculateMorphing]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const scroller = containerRef.current;
    if (!scroller) return;
    scroller.style.pointerEvents = 'none';
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    scroller.style.pointerEvents = 'auto';

    if (target && target !== scroller && target !== document.body) {
      target.click();
    }
  };

  if (!destination) return null;

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none">
      
      {/* 1. Кнопка-якорь */}
      <div 
        className="absolute z-[110] pointer-events-auto"
        style={{
          width: destination.anchorConfig.width,
          height: destination.anchorConfig.height,
          right: destination.anchorConfig.right,
          bottom: destination.anchorConfig.bottom
        }}
      >
        {destination.renderAnchor()}
      </div>

      {/* 2. Слой визуализации карточек: Рендерит строго 10–15 карточек виртуального среза */}
      <div className="absolute inset-0 overflow-hidden z-[105] pointer-events-none">
        {destination.renderItem && visibleItems.map((item) => (
          <MorphItem
            key={item.id}
            ref={(el) => {
              if (el) {
                cardsRef.current.set(item.id, el);
              } else {
                cardsRef.current.delete(item.id);
              }
            }}
            item={item}
            renderItem={destination.renderItem!}
          />
        ))}
      </div>

      {/* 3. Невидимый нативный скроллер-привод */}
      <div 
        ref={containerRef}
        onClick={handleContainerClick}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-none z-[106] pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div ref={scrollContentRef} className="w-full pointer-events-none" />
      </div>

    </div>
  );
};