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
    const [isOpening, setIsOpening] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const hasText = privateCode.trim().length > 0;

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsOpening(false);
            if (inputRef.current) inputRef.current.focus();
        }, 400);
        return () => clearTimeout(timer);
    }, []);

    const showApplyButton = !isOpening && !isInputActive && !hasText;
    const isInputVisualActive = isOpening || isInputActive || hasText;

    return (
        <div className="flex-1 flex items-center overflow-hidden">
            <AnimatePresence>
                {showApplyButton && (
                    <motion.button
                        key="filter-action-btn"
                        layout
                        initial={{ opacity: 0, width: 0, marginRight: 0 }}
                        animate={{ opacity: 1, width: 56, marginRight: 12 }}
                        exit={{ opacity: 0, width: 0, marginRight: 0 }}
                        transition={sharedSpringTransition}
                        onClick={onApplyFilters}
                        style={{ borderRadius: 9999 }}
                        className="h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:opacity-90 overflow-hidden"
                    >
                        <Check className="w-6 h-6 text-white shrink-0" />
                    </motion.button>
                )}
            </AnimatePresence>

            <motion.div
                layout
                transition={sharedSpringTransition}
                initial={{ opacity: 0 }}
                animate={{ opacity: isInputVisualActive ? 1 : 0.7 }}
                style={{ borderRadius: 9999 }}
                onClick={() => inputRef.current?.focus()}
                className={`relative flex-1 h-14 transition-shadow duration-300 overflow-hidden ${isInputVisualActive ? 'cursor-text shadow-inner' : 'cursor-pointer shadow-sm'}`}
            >
                <div className={`absolute inset-0 transition-colors duration-300 -z-10 ${isInputVisualActive ? 'bg-theme-panel' : 'bg-theme-main'}`} />
                <div className="relative z-10 w-full h-full flex items-center px-4">
                    <Search className="w-5 h-5 text-theme-text opacity-50 mr-2 shrink-0" />
                    <input
                        ref={inputRef}
                        value={privateCode}
                        onChange={e => setPrivateCode(e.target.value.toUpperCase())}
                        onFocus={() => setIsInputActive(true)}
                        onBlur={() => setIsInputActive(false)}
                        onKeyDown={(e) => e.key === 'Enter' && onJoinPrivate()}
                        placeholder={t('lobby_search_table', 'Поиск стола')}
                        className="select-text bg-transparent border-none outline-none w-full text-theme-text placeholder:text-theme-text placeholder:opacity-50 font-medium text-lg uppercase tracking-wider"
                    />
                </div>
            </motion.div>

            <AnimatePresence>
                {hasText && (
                    <motion.button
                        key="text-action-btn"
                        layout
                        initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                        animate={{ opacity: 1, width: 56, marginLeft: 12 }}
                        exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                        transition={sharedSpringTransition}
                        onClick={onJoinPrivate}
                        style={{ borderRadius: 9999 }}
                        className="h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:opacity-90 overflow-hidden"
                    >
                        <Check className="w-6 h-6 text-white shrink-0" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}