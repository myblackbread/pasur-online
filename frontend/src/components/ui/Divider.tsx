import React from 'react';

interface DividerProps {
    indent?: boolean;
    label?: string;
    className?: string;
}

export function Divider({ indent = false, label, className = '' }: DividerProps) {
    if (label) {
        return (
            <div className={`flex items-center my-4 ${className}`}>
                <div className="flex-1 border-t border-theme-border opacity-30" />
                <span className="px-4 opacity-50 text-xs font-black text-theme-text uppercase tracking-widest">{label}</span>
                <div className="flex-1 border-t border-theme-border opacity-30" />
            </div>
        );
    }

    return (
        <div className={`border-t border-theme-border opacity-30 shrink-0 ${indent ? 'ml-12' : ''} ${className}`} />
    );
}