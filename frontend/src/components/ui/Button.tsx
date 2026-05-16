import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'amber';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    fullWidth?: boolean;
    isLoading?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    fullWidth = true,
    isLoading = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = "font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
    
    // Убрали border-2 из secondary, заменили на тень
    const variants = {
        primary: "bg-theme-primary text-white shadow-md hover:shadow-lg hover:opacity-90",
        secondary: "bg-theme-panel text-theme-text shadow-sm hover:shadow-md",
        danger: "bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-lg",
        amber: "bg-amber-500 text-white shadow-md hover:bg-amber-600 hover:shadow-lg"
    };

    const sizes = {
        sm: "py-2 px-4 rounded-lg text-sm",
        md: "py-3 px-4 rounded-xl text-base",
        lg: "py-4 px-6 rounded-2xl text-lg"
    };

    const widthClass = fullWidth ? "w-full" : "w-auto";

    return (
        <button 
            disabled={disabled || isLoading}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            {...props}
        >
            {isLoading ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : icon}
            {children}
        </button>
    );
}