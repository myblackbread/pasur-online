"use client";

import React from 'react';
import { Card } from '@/types';
import { motion } from 'framer-motion';

interface PlayingCardProps {
    card: Card;
    onClick?: (card: Card) => void;
    disabled?: boolean;
    isPending?: boolean; // Оставляем проп только для блокировки двойных кликов
    isSelected?: boolean;
    isCapturedTarget?: boolean;
}

export const PlayingCard = ({ card, onClick, disabled, isPending, isSelected, isCapturedTarget }: PlayingCardProps) => {
    const isRed = card.suit === '♥' || card.suit === '♦';

    // 1. Убраны ВСЕ бордеры, прозрачности и затемнения.
    // Выделение теперь работает ИСКЛЮЧИТЕЛЬНО через красивое свечение (shadow).
    const baseClasses = `relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl flex flex-col justify-between p-1.5 sm:p-2 font-bold select-none transition-shadow
    ${isRed ? 'text-red-600 bg-red-50' : 'text-slate-900 bg-white'}
    ${isSelected ? 'shadow-[0_0_20px_rgba(251,191,36,0.8)]' : 'shadow-md'}
    ${isCapturedTarget ? 'shadow-[0_0_30px_rgba(239,68,68,0.9)]' : ''}
    ${!disabled && !isPending ? 'cursor-pointer hover:shadow-xl' : ''}`;

    // 2. Строгий контроль слоев (Z-index) и геометрии
    let targetScale = 1;
    let targetY = 0;
    let targetZIndex = 1;

    if (isCapturedTarget) {
        targetScale = 1.05;
        targetZIndex = 50; // Карты, которые сейчас заберут, поднимаются над столом
    } else if (isSelected) {
        targetY = -12; // Выделенная карта на столе слегка приподнимается
        targetZIndex = 20;
    }

    return (
        <motion.button
            layoutId={`card-${card.id}`}
            layout
            initial={false} // Убирает мерцание при первом рендере
            animate={{
                scale: targetScale,
                y: targetY,
                zIndex: targetZIndex
            }}
            whileHover={
                (!disabled && !isSelected && !isCapturedTarget && !isPending)
                    ? { y: -8, zIndex: 15 } // Легкий подъем при наведении (без изменения размера)
                    : {}
            }
            whileTap={
                (!disabled && !isPending) ? { scale: 0.95 } : {}
            }
            transition={{
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                default: { duration: 0.15 }
            }}
            // Если isPending true - мы просто не даем кликнуть еще раз, визуально ничего не меняя
            onClick={disabled || isPending || !onClick ? undefined : () => onClick(card)}
            disabled={disabled || isPending}
            className={baseClasses}
        >
            <div className="text-xs sm:text-base md:text-lg leading-none text-left">{card.rank}</div>
            <div className="text-lg sm:text-2xl md:text-3xl text-center self-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{card.suit}</div>
            <div className="text-xs sm:text-base md:text-lg leading-none text-right rotate-180">{card.rank}</div>
        </motion.button>
    );
};