"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface Country {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "KZ", name: "Казахстан", flag: "🇰🇿" },
  { code: "RU", name: "Россия", flag: "🇷🇺" },
  { code: "BY", name: "Беларусь", flag: "🇧🇾" },
  { code: "UZ", name: "Узбекистан", flag: "UZ" },
  { code: "KG", name: "Кыргызстан", flag: "🇰🇬" },
  { code: "AM", name: "Армения", flag: "🇦🇲" },
  { code: "GE", name: "Грузия", flag: "🇬🇪" },
  { code: "AZ", name: "Азербайджан", flag: "🇦🇿" },
  { code: "TR", name: "Турция", flag: "🇹🇷" },
  { code: "AE", name: "ОАЭ", flag: "🇦🇪" },
  { code: "DE", name: "Германия", flag: "🇩🇪" },
  { code: "FR", name: "Франция", flag: "🇫🇷" },
  { code: "US", name: "США", flag: "🇺🇸" },
  { code: "CN", name: "Китай", flag: "🇨🇳" },
];

function applyRubberBand(overscroll: number, containerWidth: number) {
  const abs = Math.abs(overscroll);
  const damped = (abs * containerWidth) / (abs + containerWidth);
  return overscroll < 0 ? -damped : damped;
}

interface CountryPickerProps {
  countries?: Country[];
  selectedCode?: string | null;
  renderItem: (country: Country, progress: number) => ReactNode;
  overlay?: ReactNode;
  onSelect: (country: Country) => void;
}

// Отступ капсулы от правого края в исходном состоянии
const HANDLE_RIGHT_INSET = 10;

export function CountryPicker({
  countries = COUNTRIES,
  selectedCode,
  renderItem,
  overlay,
  onSelect,
}: CountryPickerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const visualContentRef = useRef<HTMLDivElement>(null);
  const pickerWrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const isUnlockedRef = useRef(false);
  const isCalibratedRef = useRef(false);
  const isProgrammaticSyncRef = useRef(false);

  const collapsedWidthRef = useRef(46);
  const currentVisualScrollRef = useRef(0);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Храним актуальный код выбранной страны для предотвращения дублирующих вызовов onSelect
  const lastSelectedCodeRef = useRef(selectedCode);
  useEffect(() => {
    lastSelectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  const [progress, setProgress] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const getLayoutMetrics = () => {
    const scroller = scrollerRef.current;
    const visual = visualContentRef.current;
    if (!scroller || !visual) {
      return {
        containerW: 0,
        contentW: 0,
        maxScroll: 0,
        threshold: 1,
        handleX_0: 0,
        handleX_1: 0,
        centeredScrollLeft: 0,
        activeBtn: null as HTMLElement | null,
      };
    }

    const containerW = scroller.clientWidth;

    const firstChild = visual.firstElementChild as HTMLElement | null;
    const lastChild = visual.lastElementChild as HTMLElement | null;
    if (firstChild && lastChild && containerW > 0) {
      const padLeft = Math.max(16, containerW / 2 - firstChild.offsetWidth / 2);
      const padRight = Math.max(16, containerW / 2 - lastChild.offsetWidth / 2);
      visual.style.paddingLeft = `${padLeft}px`;
      visual.style.paddingRight = `${padRight}px`;
    }

    const contentW = visual.scrollWidth;
    const maxScroll = Math.max(0, contentW - containerW);

    const activeBtn = visual.querySelector(
      `[data-country-code="${selectedCode}"]`
    ) as HTMLElement | null;

    const activeWidth = activeBtn?.offsetWidth ?? 120;
    const activeLeft = activeBtn?.offsetLeft ?? 0;

    const W_0 = collapsedWidthRef.current;
    const handleX_0 = containerW - W_0 - HANDLE_RIGHT_INSET;
    const handleX_1 = containerW / 2 - activeWidth / 2;

    const threshold = Math.max(1, handleX_0 - handleX_1);

    const centeredScrollLeft = Math.max(
      0,
      Math.min(activeLeft + activeWidth / 2 - containerW / 2, maxScroll)
    );

    return {
      containerW,
      contentW,
      maxScroll,
      threshold,
      handleX_0,
      handleX_1,
      centeredScrollLeft,
      activeBtn,
    };
  };

  // Поиск карточки, центр которой ближе всего к центру видимой области контейнера
  const getClosestToCenter = (currentScrollX: number) => {
    const scroller = scrollerRef.current;
    const visual = visualContentRef.current;
    if (!scroller || !visual) return null;

    const containerW = scroller.clientWidth;
    const centerPoint = currentScrollX + containerW / 2;
    const children = Array.from(visual.children) as HTMLElement[];

    let closestDist = Infinity;
    let closestIndex = 0;
    let targetScroll = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - centerPoint);

      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
        targetScroll = childCenter - containerW / 2;
      }
    }

    const maxScroll = Math.max(0, visual.scrollWidth - containerW);
    const clampedTargetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

    return {
      country: countries[closestIndex] ?? null,
      targetScroll: clampedTargetScroll,
    };
  };

  const updateSelectionByScroll = (currentScrollX: number) => {
    const closest = getClosestToCenter(currentScrollX);
    if (closest?.country && closest.country.code !== lastSelectedCodeRef.current) {
      lastSelectedCodeRef.current = closest.country.code;
      onSelect(closest.country);
    }
  };

  const calibrateToNativeScroll = () => {
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    const visual = visualContentRef.current;
    if (!scroller || !spacer || !visual || isCalibratedRef.current) return;

    const { contentW, maxScroll } = getLayoutMetrics();
    const clampedScroll = Math.max(0, Math.min(currentVisualScrollRef.current, maxScroll));

    isProgrammaticSyncRef.current = true;
    isCalibratedRef.current = true;

    spacer.style.width = `${contentW}px`;
    scroller.scrollLeft = clampedScroll;
    currentVisualScrollRef.current = clampedScroll;
    visual.style.transform = `translate3d(${-clampedScroll}px, 0, 0)`;

    requestAnimationFrame(() => {
      isProgrammaticSyncRef.current = false;
    });
  };

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    const handle = handleRef.current;
    const visual = visualContentRef.current;
    if (!scroller || !spacer || !handle || !visual) return;

    const pillEl = handle.firstElementChild as HTMLElement | null;
    if (pillEl) {
      collapsedWidthRef.current = pillEl.getBoundingClientRect().width || 46;
    }

    const { contentW, threshold, handleX_0, centeredScrollLeft } = getLayoutMetrics();

    spacer.style.width = `${contentW + threshold + containerWFallback(scroller)}px`;
    scroller.scrollLeft = 0;

    currentVisualScrollRef.current = centeredScrollLeft;
    visual.style.transform = `translate3d(${-centeredScrollLeft}px, 0, 0)`;
    handle.style.transform = `translate3d(${handleX_0}px, 0, 0)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const { handleX_0, handleX_1, centeredScrollLeft, activeBtn } = getLayoutMetrics();

    const handleX = handleX_0 + (handleX_1 - handleX_0) * progress;

    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.1));
    }
    if (handleRef.current) {
      handleRef.current.style.transform = `translate3d(${handleX}px, 0, 0)`;
      handleRef.current.style.opacity = progress >= 1 ? "0" : "1";
    }
    if (activeBtn) {
      activeBtn.style.opacity = progress >= 1 ? "1" : "0";
    }
    if (!isUnlockedRef.current && visualContentRef.current) {
      currentVisualScrollRef.current = centeredScrollLeft;
      visualContentRef.current.style.transform = `translate3d(${-centeredScrollLeft}px, 0, 0)`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, selectedCode]);

  // Срабатывает ТОЛЬКО после полного затухания жеста/скролла
  const onGestureIdle = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const { threshold } = getLayoutMetrics();
    const scrollLeft = scroller.scrollLeft;

    // 1. Если ещё не разблокировано — возвращаем к 0 или доводим до 1
    if (!isUnlockedRef.current) {
      if (scrollLeft > 0 && scrollLeft < threshold) {
        const target = scrollLeft > threshold / 2 ? threshold : 0;
        scroller.scrollTo({ left: target, behavior: "smooth" });
      }
      return;
    }

    // 2. Калибруем спейсер под реальную ширину списка
    if (!isCalibratedRef.current) {
      calibrateToNativeScroll();
    }

    // 3. Плавно центрируем ближайшую карточку
    const closest = getClosestToCenter(scroller.scrollLeft);
    if (closest) {
      if (closest.country && closest.country.code !== lastSelectedCodeRef.current) {
        lastSelectedCodeRef.current = closest.country.code;
        onSelect(closest.country);
      }

      // Доводим скролл, только если есть реальное смещение
      if (Math.abs(scroller.scrollLeft - closest.targetScroll) > 1) {
        scroller.scrollTo({
          left: closest.targetScroll,
          behavior: "smooth",
        });
      }
    }
  };

  const handleScroll = () => {
    if (isProgrammaticSyncRef.current) return;

    const scroller = scrollerRef.current;
    const visual = visualContentRef.current;
    if (!scroller || !visual) return;

    const scrollLeft = scroller.scrollLeft;
    const { containerW, maxScroll, threshold, centeredScrollLeft, activeBtn } = getLayoutMetrics();

    // РЕЖИМ А: Спейсер откалиброван (честный нативный скролл)
    if (isCalibratedRef.current) {
      let visualX = -scrollLeft;
      if (scrollLeft < 0) {
        visualX = applyRubberBand(-scrollLeft, containerW);
      } else if (scrollLeft > maxScroll) {
        visualX = -(maxScroll + applyRubberBand(scrollLeft - maxScroll, containerW));
      }
      currentVisualScrollRef.current = scrollLeft;
      visual.style.transform = `translate3d(${visualX}px, 0, 0)`;

      // Пассивный выбор элемента на лету прямо во время скролла (без scrollTo!)
      updateSelectionByScroll(scrollLeft);

      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = setTimeout(onGestureIdle, 100);
      return;
    }

    // РЕЖИМ Б: Свайп ползунка до порога
    if (!isUnlockedRef.current && scrollLeft < threshold) {
      const nextProgress = Math.max(0, Math.min(scrollLeft / threshold, 1));
      setProgress(nextProgress);

      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = setTimeout(onGestureIdle, 100);
      return;
    }

    // РЕЖИМ В: Пересечение порога разблокировки
    if (!isUnlockedRef.current) {
      isUnlockedRef.current = true;
      setIsUnlocked(true); // Запускает анимацию проявления пикера
      if (handleRef.current) handleRef.current.style.opacity = "0";
      if (activeBtn) activeBtn.style.opacity = "1";
      if (overlayRef.current) overlayRef.current.style.opacity = "0";
      setProgress(1);
    }

    // Движение с остатком инерции от первого свайпа
    const overflow = scrollLeft - threshold;
    const rawVisualScroll = centeredScrollLeft + overflow;
    currentVisualScrollRef.current = rawVisualScroll;

    let visualX = -rawVisualScroll;
    if (rawVisualScroll < 0) {
      visualX = applyRubberBand(-rawVisualScroll, containerW);
    } else if (rawVisualScroll > maxScroll) {
      visualX = -(maxScroll + applyRubberBand(rawVisualScroll - maxScroll, containerW));
    }

    visual.style.transform = `translate3d(${visualX}px, 0, 0)`;

    updateSelectionByScroll(rawVisualScroll);

    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    scrollEndTimeoutRef.current = setTimeout(onGestureIdle, 100);
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScrollEnd = () => {
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
      onGestureIdle();
    };

    scroller.addEventListener("scrollend", handleScrollEnd);
    return () => scroller.removeEventListener("scrollend", handleScrollEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCode]);

  const selectedCountry = countries.find((c) => c.code === selectedCode) || countries[0];

  return (
    <div className="relative w-full h-[64px] overflow-hidden select-none bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* СЛОЙ 1: Список стран (появляется только при progress = 1 через transition) */}
      <div
        ref={pickerWrapperRef}
        className={`w-full h-full flex items-center transition-opacity duration-200 ease-out ${
          isUnlocked ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          ref={visualContentRef}
          className="flex items-center gap-3 px-4 w-max will-change-transform"
          style={{ transform: "translate3d(0px, 0, 0)" }}
        >
          {countries.map((country) => {
            const isSelected = country.code === selectedCode;

            return (
              <div
                key={country.code}
                data-country-code={country.code}
                style={{
                  opacity: isSelected && progress < 1 ? 0 : 1,
                }}
              >
                {renderItem(country, 1)}
              </div>
            );
          })}
        </div>
      </div>

      {/* СЛОЙ 2: Оверлей (плавно угасает по мере движения) */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10 pointer-events-none flex items-center px-5 transition-opacity duration-150"
      >
        {overlay}
      </div>

      {/* СЛОЙ 3: Ползунок */}
      <div
        ref={handleRef}
        className="absolute inset-y-0 left-0 z-20 flex items-center pointer-events-none will-change-transform transition-opacity duration-150"
      >
        {renderItem(selectedCountry, progress)}
      </div>

      {/* СЛОЙ 4: Привод-скроллер */}
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

function containerWFallback(el: HTMLElement | null) {
  return el?.clientWidth || 600;
}

// -------------------------------------------------------------------------
// ЕДИНЫЙ КОМПОНЕНТ ЯЧЕЙКИ И КАПСУЛЫ
// -------------------------------------------------------------------------

function CountryPill({
  country,
  progress,
}: {
  country: Country;
  progress: number;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (textRef.current) {
      setTextWidth(Math.ceil(textRef.current.getBoundingClientRect().width));
    }
  }, [country.name]);

  const p = Math.min(Math.max(progress, 0), 1);

  return (
    <div className="flex shrink-0 items-center h-[44px] px-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 select-none">
      <span className="text-xl leading-none shrink-0" role="img" aria-label={country.name}>
        {country.flag}
      </span>

      <div
        className="overflow-hidden flex items-center"
        style={{
          width: textWidth !== null ? `${p * textWidth}px` : p === 1 ? "auto" : "0px",
          marginLeft: `${p * 8}px`,
          opacity: p,
        }}
      >
        <span ref={textRef} className="font-medium text-sm whitespace-nowrap inline-block">
          {country.name}
        </span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// PAGE
// -------------------------------------------------------------------------

export default function Page() {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);

  return (
    <main className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Country Picker Wheel
          </h2>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            Потяните флаг для старта. Далее просто скролльте список — страна выбирается на лету и центрируется при остановке.
          </p>
        </div>

        <CountryPicker
          countries={COUNTRIES}
          selectedCode={selectedCountry.code}
          renderItem={(country, progress) => (
            <CountryPill country={country} progress={progress} />
          )}
          overlay={
            <div className="w-full text-neutral-400 dark:text-neutral-500 font-medium text-sm flex items-center">
              <span>Потяните флаг к центру для выбора</span>
            </div>
          }
          onSelect={(country) => setSelectedCountry(country)}
        />

        <div className="rounded-xl bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 text-center shadow-sm">
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
            Выбранная страна
          </span>
          <div className="mt-1 flex items-center justify-center gap-2 text-base font-medium text-neutral-900 dark:text-neutral-100">
            <span className="text-2xl">{selectedCountry.flag}</span>
            <span>{selectedCountry.name}</span>
            <span className="text-xs text-neutral-400">({selectedCountry.code})</span>
          </div>
        </div>
      </div>
    </main>
  );
}