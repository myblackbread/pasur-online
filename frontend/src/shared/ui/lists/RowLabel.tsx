"use client";

import React from "react";
import { Info, X } from 'lucide-react';

interface RowLabelProps {
    icon?: React.ReactNode;
    iconBg?: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
}

export function RowLabel({ icon, iconBg = 'bg-theme-primary', title, subtitle }: RowLabelProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    
    // 1. Добавляем стейт для высоты и реф для всего правого блока
    const [collapsedHeight, setCollapsedHeight] = React.useState<number | undefined>(undefined);
    const textRef = React.useRef<HTMLDivElement>(null);
    const rightBlockRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const checkOverflow = () => {
            if (!isExpanded) {
                if (textRef.current) {
                    setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight + 2);
                }
                // 2. Запоминаем текущую высоту текстового блока пока он свернут
                if (rightBlockRef.current) {
                    setCollapsedHeight(rightBlockRef.current.offsetHeight);
                }
            }
        };
        
        checkOverflow();
        const timeout = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => { clearTimeout(timeout); window.removeEventListener('resize', checkOverflow); };
    }, [subtitle, title, isExpanded]);

    const handleToggle = (e: React.MouseEvent) => {
        if (isOverflowing || isExpanded) {
            e.stopPropagation();
            e.preventDefault();
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div className={`flex gap-3 flex-1 min-w-0 items-center`}>
            {icon && (
                <div 
                    className="flex items-center shrink-0"
                    style={{ height: isExpanded && collapsedHeight ? `${collapsedHeight}px` : 'auto' }}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${iconBg}`}>
                        <span className="text-sm leading-none">{icon}</span>
                    </div>
                </div>
            )}
            
            <div ref={rightBlockRef} className="flex flex-col justify-around text-left flex-1 min-w-0">
                <span className="font-bold text-sm text-theme-text leading-tight break-words">
                    {title}
                </span>
                
                {subtitle && (
                    <div className={`flex items-center gap-1 w-full min-w-0 transition-all duration-300 ${isOverflowing || isExpanded ? 'cursor-pointer' : ''}`} onClick={handleToggle}>
                        <div className="flex-1 min-w-0">
                            <div ref={textRef} className={`text-[11px] sm:text-xs text-theme-muted font-medium leading-snug break-words whitespace-normal transition-all duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>
                                {subtitle}
                            </div>
                        </div>
                        
                        {(isOverflowing || isExpanded) && (
                            <div className="shrink-0 text-theme-primary flex items-center justify-center transition-transform duration-300">
                                {isExpanded ? <X className="w-4 h-4"/> : <Info className="w-4 h-4"/>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}