"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import { HybridScrollView, ScrollScreen } from '@/components/ui/hybrid-scrollbar';

const spring: Transition = { type: 'spring', stiffness: 350, damping: 35 };

function GlassPortalTest() {
    const [isOpen, setIsOpen] = useState(false);
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setTarget(document.getElementById('test-portal-root'));
    }, []);

    const modal = (
        <AnimatePresence>
            {isOpen && (
                // Используем fixed, чтобы модалка не зависела от скролла родителя
                <div className="fixed inset-0 flex items-center justify-center p-4 z-[1000]">
                    {/* Тот самый блюр фона */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Летящая стеклянная капсула */}
                    <motion.div
                        layoutId="glass-capsule"
                        transition={spring}
                        // Возвращаем стеклянный стиль
                        className="relative w-[320px] h-[500px] bg-white/50 backdrop-blur-2xl border-2 border-white rounded-[40px] p-8 shadow-2xl flex flex-col z-10 overflow-hidden"
                    >
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            transition={{ delay: 0.2 }}
                            className="flex-1 text-black"
                        >
                            <h2 className="text-3xl font-black">СТЕКЛО + ПОРТАЛ</h2>
                            <p className="mt-4 font-bold opacity-80">
                                Мы объединили рендер через Портал и стеклянный дизайн.
                            </p>
                            <div className="mt-8 space-y-4">
                                <div className="h-12 w-full bg-orange-500 rounded-2xl shadow-lg" />
                                <div className="h-12 w-full bg-cyan-500 rounded-2xl shadow-lg" />
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="mt-12 w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl"
                            >
                                ЗАКРЫТЬ
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden" 
             style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 40px, #f59e0b 40px, #f59e0b 80px)' }}>
            
            {!isOpen && (
                <motion.div
                    layoutId="glass-capsule"
                    onClick={() => setIsOpen(true)}
                    className="w-48 h-16 bg-white/80 backdrop-blur-xl border-2 border-white rounded-full flex items-center justify-center cursor-pointer shadow-2xl z-50"
                >
                    <span className="font-black text-black text-lg">ОТКРЫТЬ</span>
                </motion.div>
            )}

            {target && createPortal(modal, target)}
        </div>
    );
}

export default function TestPage() {
    const screens = useMemo<ScrollScreen[]>(() => [
        { 
            id: 'glass-test', 
            icon: <span>💎</span>, 
            content: <GlassPortalTest />,
            bgClass: 'bg-zinc-900' 
        }
    ], []);

    return (
        <main className="fixed inset-0 flex flex-col bg-zinc-950 overflow-hidden">
            <HybridScrollView screens={screens} />
            <div id="test-portal-root" />
        </main>
    );
}