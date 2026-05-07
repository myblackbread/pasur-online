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
}

export const HybridScrollView = memo(({ screens = [] }: HybridScrollViewProps) => {
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
  
  const dragOffset = useRef<number>(0);

  const updateScrollbar = useCallback(() => {
    if (!containerRef.current || !trackRef.current || !thumbHitboxRef.current || !thumbVisualRef.current || screens.length === 0) return;

    const C = containerRef.current.clientHeight;
    const P_top = containerRef.current.scrollTop; 
    const trackHeight = trackRef.current.clientHeight;
    const N = screens.length;

    const children = Array.from(containerRef.current.children).filter(c => c.hasAttribute('data-screen-index'));
    let V_total = 0; 
    const heights: number[] = [];
    const scrollTops: number[] = [];
    
    children.forEach(c => {
      const h = c.scrollHeight;
      const s = c.scrollTop;
      heights.push(h);
      scrollTops.push(s);
      V_total += h;
    });

    const parentIndex = Math.floor(P_top / C);
    const remainder = P_top % C;
    
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

    const expandedThumbHeight = Math.max(40, trackHeight / Math.max(N, 1));
    const P_max = Math.max(C * (N - 1), 1);
    const expandedProgress = Math.max(0, Math.min(1, P_top / P_max));
    const expandedThumbY = expandedProgress * (trackHeight - expandedThumbHeight);

    const isExpanded = isDragging.current || isHoveringThumb.current;
    
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
      thumbHitboxRef.current.style.transition = 'opacity 0.3s ease-out';
    }

    thumbHitboxRef.current.style.height = `${thumbHeight}px`;
    thumbHitboxRef.current.style.transform = `translateY(${thumbY}px)`;

    const activeIndex = Math.round(expandedProgress * (N - 1));
    const isVisible = isScrolling.current || isExpanded;

    thumbHitboxRef.current.style.opacity = isVisible ? '1' : '0';
    thumbHitboxRef.current.style.pointerEvents = isVisible ? 'auto' : 'none';

    // 🟢 ИСПРАВЛЕННЫЕ ПАДДИНГИ ТУТ
    if (isExpanded) {
      thumbVisualRef.current.style.width = '48px';
      thumbVisualRef.current.style.right = '8px'; // Парящая капсула (8px от края)
      thumbVisualRef.current.style.borderRadius = '24px';
      thumbVisualRef.current.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      thumbVisualRef.current.style.backdropFilter = 'blur(10px)';
      thumbVisualRef.current.style.border = '1px solid rgba(255,255,255,0.4)';
    } else {
      thumbVisualRef.current.style.width = '4px';
      thumbVisualRef.current.style.right = '3px'; // Нативный системный скроллбар (3px от края)
      thumbVisualRef.current.style.borderRadius = '9999px';
      thumbVisualRef.current.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      thumbVisualRef.current.style.backdropFilter = 'none';
      thumbVisualRef.current.style.border = 'none';
    }

    if (iconsContainerRef.current) {
      iconsContainerRef.current.style.paddingTop = `${expandedThumbHeight / 2}px`;
      iconsContainerRef.current.style.paddingBottom = `${expandedThumbHeight / 2}px`;
      
      iconsContainerRef.current.style.opacity = isExpanded ? '1' : '0';
      iconsContainerRef.current.style.transform = isExpanded ? 'translateX(0)' : 'translateX(10px)';

      const iconWrappers = iconsContainerRef.current.children;
      if (iconWrappers) {
        Array.from(iconWrappers).forEach((wrapper, i) => {
          const innerIcon = wrapper.querySelector('.icon-inner') as HTMLElement | null;
          if (innerIcon) {
            innerIcon.style.opacity = i === activeIndex ? '1' : '0.3';
            innerIcon.style.transform = i === activeIndex ? 'scale(1.3)' : 'scale(1)';
          }
        });
      }
    }
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
    if (!isDragging.current || !containerRef.current || !trackRef.current || !thumbHitboxRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const maxThumbTravel = trackRect.height - thumbHitboxRef.current.clientHeight;
    
    let targetThumbY = (e.clientY - trackRect.top) - dragOffset.current;
    targetThumbY = Math.max(0, Math.min(targetThumbY, maxThumbTravel));

    const progress = maxThumbTravel > 0 ? targetThumbY / maxThumbTravel : 0;
    const maxScroll = containerRef.current.clientHeight * (screens.length - 1);
    
    containerRef.current.scrollTop = progress * maxScroll;
  }, [screens.length]);

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
    dragOffset.current = e.clientY - thumbRect.top;

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
      className="h-[100dvh] w-full max-w-[100vw] overflow-y-scroll overflow-x-hidden snap-y snap-mandatory relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-zinc-950 overscroll-none"
    >
      {screens.map((screen, index) => (
        <div 
          key={screen.id}
          data-screen-index={index}
          className={`h-[100dvh] w-full max-w-full snap-start snap-always relative overflow-x-hidden overflow-y-auto overscroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${screen.bgClass || 'bg-zinc-900'}`}
          onScroll={wakeUpScrollbar} 
        >
          {screen.content}
        </div>
      ))}

      <div 
        ref={trackRef}
        // 🟢 Трек теперь прижат к правому краю (right-0) и имеет ширину 64px для перехвата тапов
        className="fixed right-0 top-0 bottom-0 w-[64px] z-50 touch-none pointer-events-none select-none"
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        <div 
          ref={thumbHitboxRef}
          onPointerEnter={() => { isHoveringThumb.current = true; updateScrollbar(); }}
          onPointerLeave={() => { isHoveringThumb.current = false; updateScrollbar(); }}
          onPointerDown={handlePointerDown}
          onContextMenu={(e) => e.preventDefault()}
          // 🟢 Хитбокс (невидимая область тапа) прижат к краю
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
            // 🟢 Внешний вид скроллбара (управляется через JS right: 3px / 8px)
            className="absolute h-full transition-all duration-300 ease-out box-border"
            style={{ width: '4px', right: '3px' }}
          />
        </div>

        <div 
          ref={iconsContainerRef}
          // 🟢 Иконки центрируются точно по расширенному таб-бару (right-8px, width-48px)
          className="absolute right-[8px] w-[48px] top-0 bottom-0 flex flex-col justify-between items-center transition-all duration-300 ease-out pointer-events-none z-20 box-border"
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