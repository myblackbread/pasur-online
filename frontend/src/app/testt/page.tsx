"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HybridScrollView, ScrollScreen } from '@/components/ui/hybrid-scrollbar';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';
import { ChevronDown } from 'lucide-react';

// Тестовый контент карточки (похож на OpenRoomsList)
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

    useEffect(() => {
        setTarget(document.getElementById('test-portal-root'));
    }, []);

    const tests = [
        {
            id: 'test-1-original',
            title: '1. Оригинал (Баг)',
            description: 'Использует transition-all duration-300 и CSS hover:-translate-y-0.5. Скорее всего, будет дергаться при закрытии.',
            className: 'bg-theme-panel p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-theme-border/50'
        },
        {
            id: 'test-2-safe-css',
            title: '2. Безопасный CSS',
            description: 'Использует только transition-shadow. Без transition-all и без изменения transform через CSS.',
            className: 'bg-theme-panel p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer border border-theme-border/50'
        },
        {
            id: 'test-3-framer-hover',
            title: '3. Framer Hover',
            description: 'Безопасный CSS + hover-эффект подъема реализован через whileHover от framer-motion, а не через CSS.',
            className: 'bg-theme-panel p-4 rounded-2xl shadow-sm cursor-pointer border border-theme-border/50',
            whileHover: { y: -2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }
        },
        {
            id: 'test-4-inner-layout',
            title: '4. Внутренний Layout',
            description: 'Как №2, но внутренние элементы тоже имеют проп layout="position", чтобы избежать скачков текста.',
            className: 'bg-theme-panel p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer border border-theme-border/50',
            useInnerLayout: true
        }
    ];

    const modal = (
        <AnimatePresence>
            {activeId && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        onClick={() => setActiveId(null)}
                    />
                    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 pointer-events-none">
                        <MorphingCapsule
                            isCapsule={false}
                            targetRadius={32}
                            layoutId={activeId}
                            transition={sharedSpringTransition}
                            className="w-full max-w-sm h-96 bg-theme-panel p-6 shadow-2xl flex flex-col pointer-events-auto border border-theme-border"
                        >
                            <div className="flex justify-between items-center mb-8 text-theme-text">
                                <h2 className="text-xl font-black">Детали стола</h2>
                                <button
                                    onClick={() => setActiveId(null)}
                                    className="w-12 h-12 bg-theme-main rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                                >
                                    <ChevronDown className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 bg-theme-main rounded-2xl p-4 shadow-inner">
                                <p className="opacity-50 text-center mt-10 font-bold text-theme-text">Здесь должно быть превью комнаты...</p>
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