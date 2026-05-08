import React from 'react';
import { Card } from '@/types';

interface PlayingCardProps {
    card: Card;
    onClick?: (card: Card) => void;
    disabled?: boolean;
    isPending?: boolean;
    isSelected?: boolean;
    isCapturedTarget?: boolean;
}

export const PlayingCard = ({ card, onClick, disabled, isPending, isSelected, isCapturedTarget }: PlayingCardProps) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    
    return (
        <button
            onClick={disabled || !onClick ? undefined : () => onClick(card)}
            disabled={disabled}
            className={`relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl shadow-md flex flex-col justify-between p-1.5 sm:p-2 font-bold select-none border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform
            ${isRed ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-900 border-slate-200 bg-white'}
            ${isSelected ? 'ring-4 ring-theme-primary -translate-y-3 z-10' : ''}
            ${isCapturedTarget ? 'ring-4 ring-red-500 border-red-500 scale-110 z-20 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : ''}
            ${disabled && !isSelected && !isCapturedTarget ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2 hover:shadow-xl'}
            ${isPending ? 'opacity-0 scale-50' : 'opacity-100'}`}
        >
            <div className="text-xs sm:text-base md:text-lg leading-none text-left">{card.rank}</div>
            <div className="text-lg sm:text-2xl md:text-3xl text-center self-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{card.suit}</div>
            <div className="text-xs sm:text-base md:text-lg leading-none text-right rotate-180">{card.rank}</div>
        </button>
    );
};