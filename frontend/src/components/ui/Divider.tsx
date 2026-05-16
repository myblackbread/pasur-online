import React from 'react';

interface DividerProps {
    indent?: boolean; // Включает отступ слева в стиле iOS (48px)
    className?: string;
}

export function Divider({ indent = false, className = '' }: DividerProps) {
    return (
        <div 
            className={`border-t border-theme-border opacity-30 shrink-0 ${indent ? 'ml-12' : ''} ${className}`} 
        />
    );
}