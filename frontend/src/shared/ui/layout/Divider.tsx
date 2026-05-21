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
                <div className="flex-1 h-px bg-theme-border" />
                <span className="px-4 text-[10px] font-black text-theme-muted uppercase tracking-widest">{label}</span>
                <div className="flex-1 h-px bg-theme-border" />
            </div>
        );
    }

    return (
        <div className={`h-px shrink-0 bg-theme-border ${indent ? 'ml-14' : 'mx-4'} ${className}`} />
    );
}