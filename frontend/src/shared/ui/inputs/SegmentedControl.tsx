'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentOption<T> {
    value: T;
    label: React.ReactNode;
}

interface SegmentedControlProps<T> {
    options: SegmentOption<T>[];
    value: T | null;
    onChange: (val: T) => void;
    className?: string;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange, className = '' }: SegmentedControlProps<T>) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    
    const layoutId = React.useId();

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();

        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width - 1));
        
        const segmentWidth = rect.width / options.length;
        const index = Math.floor(x / segmentWidth);
        
        const hoveredValue = options[index]?.value;
        if (hoveredValue !== undefined && hoveredValue !== value) {
            onChange(hoveredValue);
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`relative flex w-full p-1 bg-theme-panel/50 rounded-full touch-none select-none shadow-inner ${className}`}
            // Обработчики касаний
            onPointerDown={(e) => {
                e.stopPropagation();
                setIsDragging(true);
                
                const rect = containerRef.current!.getBoundingClientRect();
                let x = e.clientX - rect.left;
                x = Math.max(0, Math.min(x, rect.width - 1));
                const segmentWidth = rect.width / options.length;
                const index = Math.floor(x / segmentWidth);
                
                const clickedValue = options[index]?.value;
                if (clickedValue !== undefined && clickedValue !== value) {
                    onChange(clickedValue);
                }
                
                // Захватываем фокус пальца, чтобы свайп не прерывался при выходе за границы элемента
                e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => {
                e.stopPropagation();
                setIsDragging(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={(e) => {
                e.stopPropagation();
                setIsDragging(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
        >
            {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                    <div
                        key={String(opt.value)}
                        className="relative flex-1 h-10 flex items-center justify-center cursor-pointer"
                    >
                        {/* Плавающая плашка */}
                        {isActive && (
                            <motion.div
                                layoutId={layoutId}
                                className="absolute inset-0 bg-theme-primary rounded-full shadow-md"
                                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                            />
                        )}
                        {/* Текст */}
                        <span 
                            className={`relative z-10 text-sm font-black transition-colors duration-300 flex items-center gap-2 ${
                                isActive ? 'text-white' : 'text-theme-text opacity-60 hover:opacity-100'
                            }`}
                        >
                            {opt.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}