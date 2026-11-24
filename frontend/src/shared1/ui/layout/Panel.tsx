import React from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'modal';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Panel({ 
    children, 
    variant = 'default', 
    padding = 'md', 
    className = '', 
    ...props 
}: PanelProps) {
    const baseStyles = "bg-theme-panel overflow-hidden relative";
    
    // Убрали все бордеры, оставили только работу с тенями
    const variants = {
        default: "rounded-2xl shadow-sm",
        elevated: "rounded-3xl shadow-lg",
        modal: "rounded-[2rem] shadow-2xl"
    };

    const paddings = {
        none: "p-0",
        sm: "p-3 sm:p-4",
        md: "p-4 sm:p-6",
        lg: "p-6 sm:p-8"
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
            {children}
        </div>
    );
}