import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sharedSpringTransition } from '@/components/ui/MorphingCapsule';

interface SearchHeaderProps {
    privateCode: string;
    setPrivateCode: (code: string) => void;
    onApplyFilters: () => void;
    onJoinPrivate: () => void;
}

export function SearchHeader({ privateCode, setPrivateCode, onApplyFilters, onJoinPrivate }: SearchHeaderProps) {
    const { t } = useTranslation();
    const [isInputActive, setIsInputActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const hasText = privateCode.trim().length > 0;

    useEffect(() => {
        // Задержка фокуса: даем MorphingCapsule 300мс на красивый разлет, 
        // прежде чем iOS поднимет клавиатуру и сдвинет весь экран.
        const timer = setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex-1 flex items-center overflow-hidden">
            <AnimatePresence>
                {!isInputActive && !hasText && (
                    <motion.button
                        key="filter-action-btn"
                        layout
                        initial={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
                        animate={{ opacity: 1, scale: 1, width: 56, marginRight: 12 }}
                        exit={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
                        transition={sharedSpringTransition}
                        onClick={onApplyFilters}
                        style={{ borderRadius: 9999 }}
                        className="h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:opacity-90"
                    >
                        <Check className="w-6 h-6 text-white shrink-0" />
                    </motion.button>
                )}
            </AnimatePresence>

            <motion.div
                layout
                transition={sharedSpringTransition}
                initial={{ opacity: 0 }}
                animate={{ opacity: !isInputActive && !hasText ? 0.7 : 1 }}
                style={{ borderRadius: 9999 }}
                onClick={() => inputRef.current?.focus()}
                className={`relative flex-1 h-14 transition-shadow duration-300 overflow-hidden ${!isInputActive && !hasText ? 'cursor-pointer shadow-sm' : 'cursor-text shadow-inner'}`}
            >
                <div className={`absolute inset-0 transition-colors duration-300 -z-10 ${!isInputActive && !hasText ? 'bg-theme-main' : 'bg-theme-panel'}`} />
                <div className="relative z-10 w-full h-full flex items-center px-4">
                    <Search className="w-5 h-5 text-theme-text opacity-50 mr-2 shrink-0" />
                    <input
                        ref={inputRef}
                        value={privateCode}
                        onChange={e => setPrivateCode(e.target.value.toUpperCase())}
                        onFocus={() => setIsInputActive(true)}
                        onBlur={() => setIsInputActive(false)}
                        onKeyDown={(e) => e.key === 'Enter' && onJoinPrivate()}
                        placeholder={t('lobby_game_code') || "Введите код"}
                        className="select-text bg-transparent border-none outline-none w-full text-theme-text placeholder:text-theme-text placeholder:opacity-50 font-medium text-lg uppercase tracking-wider"
                    />
                </div>
            </motion.div>

            <AnimatePresence>
                {hasText && (
                    <motion.button
                        key="text-action-btn"
                        layout
                        initial={{ opacity: 0, scale: 0.5, width: 0, marginLeft: 0 }}
                        animate={{ opacity: 1, scale: 1, width: 56, marginLeft: 12 }}
                        exit={{ opacity: 0, scale: 0.5, width: 0, marginLeft: 0 }}
                        transition={sharedSpringTransition}
                        onClick={onJoinPrivate}
                        style={{ borderRadius: 9999 }}
                        className="h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:opacity-90"
                    >
                        <Check className="w-6 h-6 text-white shrink-0" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}