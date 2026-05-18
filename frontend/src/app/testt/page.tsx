"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, useMotionValue, animate } from 'framer-motion';
import { HybridScrollView, ScrollScreen } from '@/components/ui/hybrid-scrollbar';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';
import { ChevronDown, Search, Check } from 'lucide-react';

// Тестовый контент карточки
const CardContent = ({ title }: { title: string }) => (
    <div className="flex gap-4 w-full h-full text-theme-text items-center pointer-events-none select-none">
        <div className="text-2xl shrink-0 bg-theme-main w-12 h-12 rounded-xl flex items-center justify-center shadow-inner">🎲</div>
        <div className="flex-1 flex flex-col justify-center text-left min-w-0">
            <div className="font-bold text-lg truncate w-full">{title}</div>
            <div className="text-xs opacity-70 font-medium mt-1">Классика • 100 💰</div>
        </div>
    </div>
);

function AnimationTest() {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [target, setTarget] = useState<HTMLElement | null>(null);
    
    const dragControls = useDragControls();
    const y = useMotionValue(0); 
    
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTarget(document.getElementById('test-portal-root'));
    }, []);

    // Сбрасываем позицию окна при каждом его открытии
    useEffect(() => {
        if (activeId) y.set(0);
    }, [activeId, y]);

    // 🟢 Магия: Умный "Pull-to-close" для смартфонов, мыши и ТРЕКПАДОВ
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let startY = 0;
        let lastY = 0;
        let isPulling = false;
        let pullStartY = 0;
        let lastTime = 0;
        let velocity = 0;

        // --- Общая логика для Touch и Mouse ---
        const handleStart = (clientY: number) => {
            startY = clientY;
            lastY = startY;
            lastTime = performance.now();
            velocity = 0;

            if (el.scrollTop <= 1) {
                isPulling = true;
                pullStartY = startY;
            } else {
                isPulling = false;
            }
        };

        const handleMove = (clientY: number, e: Event) => {
            const dy = clientY - lastY;
            const now = performance.now();
            const dt = now - lastTime;
            
            if (dt > 0) velocity = dy / (dt / 1000);
            
            lastY = clientY;
            lastTime = now;

            // Если скроллили вверх и достигли потолка, перехватываем в перетаскивание
            if (el.scrollTop <= 1 && dy > 0 && !isPulling) {
                isPulling = true;
                pullStartY = clientY;
            }

            if (isPulling) {
                const pullDistance = clientY - pullStartY;
                if (pullDistance > 0) {
                    y.set(pullDistance * 0.8);
                    if (e.cancelable) e.preventDefault(); // Блокируем скролл браузера
                } else {
                    isPulling = false;
                    y.set(0);
                }
            }
        };

        const handleEnd = () => {
            if (isPulling) {
                if (y.get() > 120 || velocity > 400) {
                    setActiveId(null);
                } else {
                    animate(y, 0, { type: "spring", stiffness: 350, damping: 35 });
                }
            }
            isPulling = false;
        };

        // 1. TOUCH EVENTS (Телефоны)
        const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientY);
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY, e);

        // 2. MOUSE EVENTS (Клик и тяга на десктопе)
        let isMouseDown = false;
        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return; // Только левый клик
            isMouseDown = true;
            handleStart(e.clientY);
        };
        const onMouseMove = (e: MouseEvent) => {
            if (!isMouseDown) return;
            handleMove(e.clientY, e);
        };
        const onMouseUp = () => {
            if (!isMouseDown) return;
            isMouseDown = false;
            handleEnd();
        };

        // 3. WHEEL EVENTS (Трекпады и колесико мыши)
        let wheelTimeout: NodeJS.Timeout;
        const onWheel = (e: WheelEvent) => {
            // e.deltaY < 0 означает скролл вверх (то есть мы тянем контент вниз)
            if (el.scrollTop <= 1 && e.deltaY < 0) {
                const currentY = y.get();
                const pullAmount = -e.deltaY * 0.8;
                const newY = currentY + pullAmount;
                
                if (newY > 0) {
                    y.set(newY);
                    if (e.cancelable) e.preventDefault(); // Глушим системный "rubber-band" на Mac
                }

                // Эмулируем отпускание (end) после остановки трекпада
                clearTimeout(wheelTimeout);
                wheelTimeout = setTimeout(() => {
                    if (y.get() > 120) {
                        setActiveId(null);
                    } else if (y.get() > 0) {
                        animate(y, 0, { type: "spring", stiffness: 350, damping: 35 });
                    }
                }, 150);
            } else if (y.get() > 0 && e.deltaY > 0) {
                // Если мы уже оттянули окно и скроллим обратно вверх (контент едет вниз)
                const currentY = y.get();
                const pullAmount = -e.deltaY * 0.8; // будет отрицательным
                const newY = Math.max(0, currentY + pullAmount);
                y.set(newY);
                if (e.cancelable) e.preventDefault();
            }
        };

        // Подписки на события
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', handleEnd, { passive: true });
        el.addEventListener('touchcancel', handleEnd, { passive: true });

        el.addEventListener('mousedown', onMouseDown, { passive: true });
        window.addEventListener('mousemove', onMouseMove, { passive: false });
        window.addEventListener('mouseup', onMouseUp, { passive: true });

        el.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', handleEnd);
            el.removeEventListener('touchcancel', handleEnd);
            
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            el.removeEventListener('wheel', onWheel);
            clearTimeout(wheelTimeout);
        };
    }, [activeId, y]);

    interface TestItem {
        id: string;
        title: string;
        description: string;
        className: string;
        whileHover?: any;
        useInnerLayout?: boolean;
    }

    const tests: TestItem[] =[
        {
            id: 'test-1-original',
            title: '1. Баг-тест',
            description: 'Оригинальная карточка',
            className: 'bg-theme-panel p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-theme-border/50'
        },
        {
            id: 'test-2-safe-css',
            title: '2. Умная капсула',
            description: 'Попробуй открыть эту и поскроллить',
            className: 'bg-theme-panel p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer border border-theme-border/50'
        }
    ];

    const modal = (
        <AnimatePresence>
            {activeId && (
                <>
                    {/* Затемнение фона */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        onClick={() => setActiveId(null)}
                    />
                    
                    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 pointer-events-none safe-padding">
                        <MorphingCapsule
                            isCapsule={false}
                            targetRadius={32}
                            layoutId={activeId}
                            transition={sharedSpringTransition}
                            
                            style={{ y }} 
                            drag="y"
                            dragControls={dragControls}
                            dragListener={false} 
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(e, info) => {
                                // Эта физика срабатывает, если тянем за саму шапку окна
                                if (info.offset.y > 120 || info.velocity.y > 400) {
                                    setActiveId(null);
                                }
                            }}
                            
                            className="relative w-full max-w-sm h-[80dvh] bg-theme-panel shadow-2xl pointer-events-auto border border-theme-border overflow-hidden"
                        >
                            
                            {/* БЕСКОНЕЧНЫЙ ХОЛСТ (Скролл) */}
                            <div 
                                ref={scrollRef} 
                                className="absolute inset-0 overflow-y-auto z-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-none pb-32"
                            >
                                <div className="h-24 w-full shrink-0" />
                                
                                <div className="px-5 space-y-3">
                                    <div className="bg-theme-main rounded-2xl p-6 shadow-inner mb-4 flex flex-col items-center justify-center border border-theme-border/20">
                                        <Search className="w-8 h-8 opacity-30 mb-2 text-theme-text" />
                                        <p className="opacity-50 text-center font-bold text-theme-text text-sm">Параметры комнаты</p>
                                    </div>
                                    
                                    {Array.from({ length: 15 }).map((_, i) => (
                                        <div key={i} className="bg-theme-main rounded-xl p-4 shadow-sm border border-theme-border/30 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-theme-panel rounded-lg flex items-center justify-center text-lg shadow-inner shrink-0 text-theme-text">✨</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-theme-text text-sm truncate">Элемент холста {i + 1}</p>
                                                <p className="text-xs text-theme-text opacity-50 mt-0.5 truncate">Скроллится под шапку и кнопки</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ПАРЯЩИЙ UI СВЕРХУ (Шапка) */}
                            <div 
                                className="absolute top-0 left-0 right-0 z-10 touch-none"
                                onPointerDown={(e) => dragControls.start(e)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-theme-panel via-theme-panel/90 to-transparent h-28 -z-10 pointer-events-none" />
                                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-theme-text/20 rounded-full pointer-events-none" />

                                <div className="relative flex justify-between items-start p-5 pt-6 pointer-events-auto cursor-grab active:cursor-grabbing">
                                    <h2 className="text-2xl font-black text-theme-text drop-shadow-md">Настройки</h2>
                                    <button
                                        onClick={() => setActiveId(null)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="w-10 h-10 bg-theme-main rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all border border-theme-border/50"
                                    >
                                        <ChevronDown className="w-6 h-6 text-theme-text opacity-70" />
                                    </button>
                                </div>
                            </div>

                            {/* ПАРЯЩИЙ UI СНИЗУ (Подвал с кнопкой) */}
                            <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pointer-events-none">
                                <div className="absolute inset-0 bg-gradient-to-t from-theme-panel via-theme-panel/90 to-transparent h-32 bottom-0 -z-10" />
                                
                                <div className="relative flex pointer-events-auto mt-auto">
                                    <button 
                                        onClick={() => setActiveId(null)}
                                        className="w-full bg-theme-primary text-white flex items-center justify-center gap-2 font-black py-4 rounded-2xl shadow-lg hover:shadow-xl hover:opacity-90 active:scale-[0.98] transition-all"
                                    >
                                        <Check className="w-5 h-5" /> ПОДТВЕРДИТЬ
                                    </button>
                                </div>
                            </div>

                        </MorphingCapsule>
                    </div>
                </>
            )}
        </AnimatePresence>
    );

    return (
        <div className="w-full h-full flex flex-col items-center p-4 overflow-y-auto safe-padding">
            <h1 className="text-2xl font-black mb-8 text-theme-text mt-4">Тест Анимации Layout</h1>
            
            <div className="w-full max-w-md flex flex-col gap-6 relative z-10 pb-32">
                {tests.map(test => (
                    <div key={test.id} className="flex flex-col gap-2">
                        <div className="text-xs font-bold opacity-50 px-2">{test.description}</div>
                        
                        <MorphingCapsule
                            isCapsule={false}
                            targetRadius={16}
                            layoutId={test.id}
                            transition={sharedSpringTransition}
                            className={test.className}
                            whileHover={test.whileHover}
                            onClick={() => setActiveId(test.id)}
                        >
                            {test.useInnerLayout ? (
                                <motion.div layout="position" className="w-full h-full">
                                    <CardContent title={test.title} />
                                </motion.div>
                            ) : (
                                <CardContent title={test.title} />
                            )}
                        </MorphingCapsule>
                    </div>
                ))}
            </div>

            {target && createPortal(modal, target)}
        </div>
    );
}

export default function TestPage() {
    const screens = useMemo<ScrollScreen[]>(() => [
        { 
            id: 'animation-test', 
            icon: <span>🧪</span>, 
            content: <AnimationTest />,
            bgClass: 'bg-theme-main' 
        }
    ], []);

    return (
        <main className="fixed inset-0 flex flex-col bg-theme-main overflow-hidden text-theme-text">
            <HybridScrollView screens={screens} />
            <div id="test-portal-root" className="fixed inset-0 pointer-events-none z-[9999]" />
        </main>
    );
}