"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HybridScrollView, ScrollScreen } from '@/components/ui/hybrid-scrollbar';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';
import { CapsuleModal } from '@/components/ui/CapsuleModal';
import { Plus, Check } from 'lucide-react';
import { InscribedZone } from '@/components/ui/InscribedZone';

function AnimationTest() {
    const [view, setView] = useState<'none' | 'safe' | 'bug'>('none');
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [randomText, setRandomText] = useState('');

    useEffect(() => {
        setPortalNode(document.getElementById('test-portal-root'));
    }, []);

    // 🔴 ТОТ САМЫЙ БАГ: Срабатывает СРАЗУ после открытия и вызывает второй рендер
    useEffect(() => {
        if (view === 'bug') {
            setRandomText(`Случайный текст из useEffect: ${Math.random().toString(36).substring(7)}`);
        }
    }, [view]);

    const floatingUI = (
        <>
            <CapsuleModal
                isOpen={view !== 'none'}
                onClose={() => setView('none')}
                layoutId={view === 'safe' ? 'wrapper-safe' : 'wrapper-bug'}
                headerLeft={
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.5 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.5 }} 
                        onClick={() => setView('none')} 
                        className={`w-14 h-14 ${view === 'safe' ? 'bg-emerald-500' : 'bg-red-500'} flex items-center justify-center shrink-0 shadow-md hover:opacity-90 rounded-full cursor-pointer`}
                    >
                        <Check className="w-6 h-6 text-white" />
                    </motion.button>
                }
            >
                <div className="p-6 h-[400px]">
                    <h2 className="text-2xl font-black text-theme-text mb-4">
                        {view === 'safe' ? "Safe Mode ✅" : "Bug Mode ❌"}
                    </h2>
                    <p className="opacity-70 font-medium mb-6">
                        {view === 'safe' 
                            ? "Здесь мы сгенерировали текст прямо в обработчике onClick. Рендер был только один, Framer Motion успел всё просчитать, морфинг работает." 
                            : "Здесь сработал useEffect, который вызвал второй рендер (Double Render) прямо во время старта анимации. Framer Motion сошел с ума, и окно просто дернулось."}
                    </p>
                    <div className="p-4 bg-theme-main rounded-xl font-mono text-sm shadow-inner">
                        {randomText}
                    </div>
                </div>
            </CapsuleModal>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-[80]">
                <AnimatePresence>
                    {view === 'none' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0 }} 
                            className="flex justify-center gap-8 w-full max-w-md pointer-events-auto"
                        >
                            {/* 🟢 SAFE BUTTON */}
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider text-center">Генерируем<br/>в onClick</span>
                                <MorphingCapsule 
                                    isCapsule 
                                    layoutId="wrapper-safe" 
                                    transition={sharedSpringTransition} 
                                    onClick={() => {
                                        // ✅ ПРАВИЛЬНЫЙ ПОДХОД: Обновляем оба стейта ОДНОВРЕМЕННО
                                        setRandomText(`Случайный текст из onClick: ${Math.random().toString(36).substring(7)}`);
                                        setView('safe');
                                    }} 
                                    className="relative w-14 h-14 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
                                >
                                    <div className="absolute inset-0 bg-emerald-500 backdrop-blur-xl -z-10" />
                                    <InscribedZone>
                                        <Plus className="w-6 h-6 text-white" />
                                    </InscribedZone>
                                </MorphingCapsule>
                            </div>

                            {/* 🔴 BUG BUTTON */}
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-bold text-red-500 uppercase tracking-wider text-center">Генерируем<br/>в useEffect</span>
                                <MorphingCapsule 
                                    isCapsule 
                                    layoutId="wrapper-bug" 
                                    transition={sharedSpringTransition} 
                                    onClick={() => setView('bug')} 
                                    className="relative w-14 h-14 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
                                >
                                    <div className="absolute inset-0 bg-red-500 backdrop-blur-xl -z-10" />
                                    <InscribedZone>
                                        <Plus className="w-6 h-6 text-white" />
                                    </InscribedZone>
                                </MorphingCapsule>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );

    return (
        <div className="w-full h-full flex flex-col items-center p-4 overflow-y-auto safe-padding relative">
            <h1 className="text-2xl font-black mb-4 text-theme-text mt-4 text-center">Double Render Bug 🐛</h1>
            <p className="text-sm opacity-60 text-center mb-12 max-w-md">
                Ты нашел причину! Обновление состояния через useEffect сразу после открытия модалки прерывает вычисления Framer Motion. Нажми на кнопки, чтобы убедиться.
            </p>
            {portalNode && createPortal(floatingUI, portalNode)}
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