import React, { ReactNode } from 'react';

// 1. Обертка для секции (осталась без изменений)
interface InfoSectionProps {
    title?: string;
    footer?: string;
    children: ReactNode;
    className?: string;
}

export function InfoSection({ title, footer, children, className = '' }: InfoSectionProps) {
    return (
        <div className={`mb-6 ${className}`}>
            {title && <h3 className="uppercase text-[10px] sm:text-xs font-bold text-theme-text opacity-50 ml-4 mb-2 tracking-wider">{title}</h3>}
            <div className="bg-theme-main p-1 rounded-[28px] shadow-inner border border-theme-border/30 flex flex-col gap-1">
                {children}
            </div>
            {footer && <p className="text-[10px] sm:text-xs text-theme-text opacity-50 ml-4 mt-2 font-medium">{footer}</p>}
        </div>
    );
}

interface InfoRowProps {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'default' | 'none';
}

export function InfoRow({ children, onClick, className = '', variant = 'default' }: InfoRowProps) {
    const padding = variant === 'default' ? 'px-3' : '';
    
    return (
        <div 
            onClick={onClick} 
            className={`flex items-center justify-between min-h-[48px] w-full rounded-full transition-all ${padding} ${
                onClick ? 'cursor-pointer' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
}
interface RowLabelProps {
    icon?: ReactNode;
    iconBg?: string;
    title: ReactNode;
    subtitle?: ReactNode;
}

export function RowLabel({ icon, iconBg = 'bg-theme-primary', title, subtitle }: RowLabelProps) {
    return (
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${iconBg}`}>
                    <span className="text-sm leading-none">{icon}</span>
                </div>
            )}
            <div className="flex flex-col justify-center text-left">
                <span className="font-bold text-sm text-theme-text leading-tight truncate">{title}</span>
                {subtitle && <span className="text-[10px] text-theme-text opacity-50 font-medium leading-tight truncate mt-0.5">{subtitle}</span>}
            </div>
        </div>
    );
}