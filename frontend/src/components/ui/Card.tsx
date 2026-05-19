import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
    return (
        <div className={`bg-theme-panel rounded-3xl shadow-xl overflow-hidden ${className}`} {...props}>
            {children}
        </div>
    );
}