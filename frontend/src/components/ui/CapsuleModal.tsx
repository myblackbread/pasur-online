"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';

interface CapsuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    layoutId: string;
    headerLeft: React.ReactNode;
    children: React.ReactNode;
    portalNode?: HTMLElement | null;
    closeButtonLayoutId?: string; // Полезно, если другая капсула должна "схлопнуться" в эту кнопку
}

export function CapsuleModal({
    isOpen,
    onClose,
    layoutId,
    headerLeft,
    children,
    portalNode,
    closeButtonLayoutId
}: CapsuleModalProps) {
    const content = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Затемнение фона */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                        style={{ zIndex: 60 }}
                        onClick={onClose}
                    />

                    {/* Сама развернутая капсула */}
                    <MorphingCapsule
                        isCapsule={false}
                        targetRadius={32}
                        layoutId={layoutId}
                        transition={sharedSpringTransition}
                        className="absolute inset-2 sm:inset-4 p-3 sm:p-4 flex flex-col pointer-events-auto shadow-2xl"
                        style={{ zIndex: 70 }}
                    >
                        {/* Эффект стекла для карточки */}
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-2xl border border-white/40 -z-10" />

                        <div className="relative z-10 flex flex-col w-full h-full">

                            {/* НЕСКРОЛЛИРУЕМЫЙ ХЕДЕР */}
                            <div className="flex items-center gap-3">
                                {headerLeft}

                                {/* Кнопка закрытия/свернуть */}
                                <motion.button
                                    layoutId={closeButtonLayoutId}
                                    transition={sharedSpringTransition}
                                    onClick={onClose}
                                    style={{ borderRadius: 9999 }}
                                    className="relative w-14 h-14 flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:opacity-80 overflow-hidden ml-auto"
                                >
                                    <div className="absolute inset-0 bg-white/60 border border-white/50 -z-10" />
                                    <motion.div layoutId="action-icon" transition={sharedSpringTransition} className="relative z-10">
                                        <ChevronDown className="w-6 h-6 text-gray-800" />
                                    </motion.div>
                                </motion.button>
                            </div>

                            {/* СКРОЛЛИРУЕМЫЙ ОСНОВНОЙ КОНТЕНТ */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3, ease: 'easeOut' } }}
                                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                                className="mt-6 px-2 flex-1 overflow-y-auto pb-4"
                            >
                                {children}
                            </motion.div>
                        </div>
                    </MorphingCapsule>
                </>
            )}
        </AnimatePresence>
    );

    // Если передан узел портала — рендерим в него, иначе по месту
    if (portalNode) {
        return createPortal(content, portalNode);
    }
    return content;
}