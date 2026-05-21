import React from 'react';
import { useTranslation } from 'react-i18next';

interface CardBackProps {
    count: number;
    label?: string;
    isAnimating?: boolean;
    isEmpty?: boolean;
}

export const CardBack = ({ count, label, isAnimating, isEmpty }: CardBackProps) => {
    const { t } = useTranslation();
    
    if (isEmpty) return (
        <div className="relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl bg-theme-panel/30 shadow-inner opacity-60 flex flex-col items-center justify-center text-theme-text select-none">
            <span className="text-[10px] sm:text-xs font-bold">{t('game_empty')}</span>
            {label && <span className="absolute -bottom-5 sm:-bottom-6 text-[10px] sm:text-xs whitespace-nowrap font-bold opacity-70">{label}</span>}
        </div>
    );
    
    return (
        <div className={`relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl shadow-md flex flex-col items-center justify-center text-theme-text font-black select-none transition-all duration-300 ${isAnimating ? 'scale-125 -translate-y-4 ring-4 ring-amber-400 shadow-xl z-10' : ''}`} style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-panel), var(--bg-panel) 10px, var(--bg-main) 10px, var(--bg-main) 20px)' }}>
            <div className="bg-theme-main px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs sm:text-sm md:text-xl shadow-sm">{count}</div>
            {label && <span className="absolute -bottom-5 sm:-bottom-6 text-[10px] sm:text-xs whitespace-nowrap opacity-70 font-bold">{label}</span>}
        </div>
    );
};