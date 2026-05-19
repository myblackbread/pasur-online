import React from 'react';

interface InfoSectionProps {
    title?: string;
    footer?: string;
    children: React.ReactNode;
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
    icon?: React.ReactNode;
    iconBg?: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    rightContent?: React.ReactNode;
    onClick?: () => void;
    className?: string;
}

export function InfoRow({ icon, iconBg = 'bg-theme-primary', title, subtitle, rightContent, onClick, className = '' }: InfoRowProps) {
    return (
        <div 
            onClick={onClick} 
            className={`flex items-center justify-between px-3 h-12 rounded-full transition-all ${onClick ? 'cursor-pointer active:scale-[0.98] hover:bg-theme-panel hover:shadow-sm' : ''} ${className}`}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {icon && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${iconBg}`}>
                        <span className="text-sm leading-none">{icon}</span>
                    </div>
                )}
                <div className="flex flex-col justify-center">
                    <span className="font-bold text-sm text-theme-text leading-tight truncate">{title}</span>
                    {subtitle && <span className="text-[10px] text-theme-text opacity-50 font-medium leading-tight truncate mt-0.5">{subtitle}</span>}
                </div>
            </div>
            {rightContent && (
                <div className="shrink-0 ml-3 flex items-center">
                    {rightContent}
                </div>
            )}
        </div>
    );
}