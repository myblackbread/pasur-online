"use client";

import React, { useRef, useState, useEffect } from "react";
import { Info, X } from 'lucide-react';

interface RowLabelProps {
    icon?: React.ReactNode;
    iconBg?: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
}

export function RowLabel({ icon, iconBg = 'bg-theme-primary', title, subtitle }: RowLabelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Если текст уже развернут, нам не нужно пересчитывать overflow
        if (isExpanded) return;

        const checkOverflow = () => {
            if (textRef.current) {
                // Добавляем 2px запаса для избежания ложных срабатываний из-за межстрочного интервала
                setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight + 2);
            }
        };
        
        checkOverflow();
        // Даем браузеру время отрендерить шрифты
        const timeout = setTimeout(checkOverflow, 100);

        // ResizeObserver намного эффективнее глобального слушателя window.resize
        const observer = new ResizeObserver(checkOverflow);
        if (textRef.current) observer.observe(textRef.current);
        
        return () => { 
            clearTimeout(timeout); 
            observer.disconnect(); 
        };
    }, [subtitle, title, isExpanded]);

    const handleToggle = (e: React.MouseEvent) => {
        if (isOverflowing || isExpanded) {
            e.stopPropagation();
            e.preventDefault();
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div className="min-h-14 flex gap-3 flex-1 min-w-0 items-start py-2">
            {icon && (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white ${iconBg}`}>
                    {/* Увеличен размер текста для красивого отображения эмодзи */}
                    <span className="text-xl leading-none">{icon}</span>
                </div>
            )}
            
            {/* 
              Текстовый блок всегда не меньше высоты иконки (48px).
              Если контента мало - он идеально центрируется.
              Если текст раскрывается - блок растет вниз, а иконка остается на месте.
            */}
            <div className="flex flex-col justify-center min-h-10 text-left flex-1 min-w-0">
                <span className="font-bold text-sm text-theme-text leading-tight break-words">
                    {title}
                </span>
                
                {subtitle && (
                    <div 
                        className={`flex items-start gap-1 w-full min-w-0 mt-0.5 transition-colors ${
                            isOverflowing || isExpanded ? 'cursor-pointer hover:opacity-80' : ''
                        }`} 
                        onClick={handleToggle}
                    >
                        <div className="flex-1 min-w-0">
                            <div 
                                ref={textRef} 
                                className={`text-[11px] sm:text-xs text-theme-muted font-medium leading-snug break-words transition-all duration-300 ${
                                    isExpanded ? '' : 'line-clamp-1'
                                }`}
                            >
                                {subtitle}
                            </div>
                        </div>
                        
                        {(isOverflowing || isExpanded) && (
                            <div className="shrink-0 text-theme-primary flex items-center justify-center pt-0.5 transition-transform duration-300">
                                {isExpanded ? <X className="w-4 h-4"/> : <Info className="w-4 h-4"/>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}