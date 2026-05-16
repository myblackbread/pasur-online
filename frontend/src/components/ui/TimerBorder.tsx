import React from 'react';

interface TimerBorderProps {
    progress: number; // от 0 до 1
}

export function TimerBorder({ progress }: TimerBorderProps) {
    return (
        <div
            className="absolute inset-0 rounded-xl pointer-events-none z-10 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(251,191,36,0.5)]"
            style={{
                // Градиент начинается с 12 часов (0deg) и плавно исчезает по часовой стрелке
                background: `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, #fbbf24 ${(1 - progress) * 360}deg)`,
                // Отступ равен ширине нужного нам бордера
                padding: '4px',
                // CSS Mask "вырезает" внутреннюю часть, оставляя только наш padding, создавая эффект бордера
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
            }}
        />
    );
}