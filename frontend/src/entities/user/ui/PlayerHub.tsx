import React from 'react';
import { PlayerDTO } from '@/shared/api/contracts/dto';
import { TimerBorder } from '@/shared/ui/animations/TimerBorder';
import { MorphingCapsule } from '@/shared/ui/animations/MorphingCapsule';

// Вытаскиваем тип публичного игрока (без массива hand, но с handCount), 
// точно так же, как он приходит в PublicGameStateDTO
type PublicPlayer = Omit<PlayerDTO, 'hand'> & { handCount: number };

interface PlayerHubProps {
    player: PublicPlayer;
    isTurn: boolean;
    turnDurationMs: number; // Принимаем миллисекунды из DTO
    turnTimeLeft: number; // Оставшееся время (в секундах, например, из useCountdown)
    avatarEmoji: string;
    onClick?: () => void;
    avatarType?: string;
}

export const PlayerHub = ({
    player, 
    isTurn, 
    turnDurationMs, 
    turnTimeLeft, 
    avatarEmoji, 
    onClick, 
    avatarType
}: PlayerHubProps) => {
    const captureCount = player.captured.length;
    const hasCaptures = captureCount > 0;
    const hasSurs = player.surs > 0;
    
    // Считаем прогресс (защита от деления на ноль)
    const maxTimeSec = turnDurationMs / 1000;
    const progress = maxTimeSec > 0 ? turnTimeLeft / maxTimeSec : 0;

    const innerContent = (
        <div className={`absolute inset-0 rounded-xl flex flex-col select-none transition-all duration-300
            ${isTurn ? 'border-4 border-transparent shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'border-4 border-theme-border shadow-md'}
            ${!hasCaptures && !isTurn ? 'bg-theme-panel/50 opacity-80' : 'bg-theme-main'}
        `}>
            {hasSurs && (
                <div className="w-full bg-purple-500 text-white text-[10px] sm:text-xs font-black py-0.5 flex items-center justify-center gap-1 shadow-sm shrink-0">
                    ⭐ {player.surs}
                </div>
            )}

            <div className="flex-1 flex items-center justify-center relative">
                <span className="text-2xl sm:text-3xl md:text-4xl transition-transform duration-300">
                    {avatarEmoji}
                </span>
            </div>

            {hasCaptures && (
                <div className="w-full bg-theme-primary text-white text-[10px] sm:text-xs md:text-sm font-black py-0.5 sm:py-1 flex items-center justify-center shadow-inner shrink-0">
                    {captureCount}
                </div>
            )}
        </div>
    );

    return (
        <div 
            // 🎯 ID обязателен! По нему глобальный аниматор будет вычислять, куда отправлять карты при взятке ('capture')
            id={`player-hub-${player.id}`} 
            className={`relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
            onClick={onClick}
        >
            {avatarType ? (
                <MorphingCapsule
                    isCapsule={false}
                    targetRadius={12} // Соответствует Tailwind rounded-xl
                    layoutId={`avatar-${avatarType}`}
                    className="absolute inset-0 rounded-xl"
                >
                    {innerContent}
                </MorphingCapsule>
            ) : (
                <div className="absolute inset-0 rounded-xl">
                    {innerContent}
                </div>
            )}

            {isTurn && <TimerBorder progress={progress} />}
        </div>
    );
};