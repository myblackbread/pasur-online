import React from 'react';
import { Divider } from './Divider';

interface InfoSectionProps {
    title?: string;
    footer?: string;
    children: React.ReactNode;
    className?: string;
}

export function InfoSection({ title, footer, children, className = '' }: InfoSectionProps) {
    return (
        <div className={`mb-6 ${className}`}>
            {title && <h3 className="uppercase text-xs font-bold text-theme-text opacity-50 ml-4 mb-2 tracking-wider">{title}</h3>}
            <div className="bg-theme-panel rounded-2xl overflow-hidden shadow-sm flex flex-col">
                {children}
            </div>
            {footer && <p className="text-xs text-theme-text opacity-50 ml-4 mt-2 font-medium">{footer}</p>}
        </div>
    );
}

interface InfoRowProps {
    icon?: React.ReactNode;
    iconBg?: string; // Tailwind класс фона, например 'bg-blue-500'
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    rightContent?: React.ReactNode;
    onClick?: () => void;
    noDivider?: boolean;
    className?: string;
}

export function InfoRow({ icon, iconBg = 'bg-theme-primary', title, subtitle, rightContent, onClick, noDivider, className = '' }: InfoRowProps) {
    return (
        <>
            <div 
                onClick={onClick} 
                className={`flex items-center justify-between p-3 sm:p-4 ${onClick ? 'cursor-pointer active:bg-theme-main hover:bg-theme-main/50' : ''} transition-colors ${className}`}
            >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {icon && (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${iconBg}`}>
                            {icon}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-bold text-sm sm:text-base text-theme-text">{title}</span>
                        {subtitle && <span className="text-[10px] sm:text-xs text-theme-text opacity-50 font-medium mt-0.5 leading-tight pr-2">{subtitle}</span>}
                    </div>
                </div>
                {rightContent && (
                    <div className="shrink-0 ml-2 flex items-center">
                        {rightContent}
                    </div>
                )}
            </div>
            {!noDivider && <Divider indent={!!icon} />}
        </>
    );
}