import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    children: React.ReactNode;
}

export function Label({ children, className = '', ...props }: LabelProps) {
    return (
        <label className={`block text-sm opacity-70 mb-2 px-1 font-bold text-theme-text tracking-wide ${className}`} {...props}>
            {children}
        </label>
    );
}