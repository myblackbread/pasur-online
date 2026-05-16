import React from 'react';
import { ChevronRight } from 'lucide-react';

interface NavigationItemProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;      // Любой контент слева
    rightContent?: React.ReactNode; // Любой контент справа перед стрелкой
    showArrow?: boolean;            // Показывать ли стрелку
}

export function NavigationItem({
    children,
    rightContent,
    showArrow = true,
    className = '',
    onClick,
    ...props
}: NavigationItemProps) {
    return (
        <div 
            onClick={onClick}
            className={`flex items-center justify-between gap-3 w-full ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
            {...props}
        >
            <div className="flex-1 flex items-center gap-3 min-w-0">
                {children}
            </div>

            {(rightContent || showArrow) && (
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {rightContent}
                    {showArrow && <ChevronRight className="w-5 h-5 text-theme-text opacity-50 shrink-0" />}
                </div>
            )}
        </div>
    );
}