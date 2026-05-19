import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', error, ...props }, ref) => {
        return (
            <div className="w-full flex flex-col">
                <input
                    ref={ref}
                    className={`w-full h-12 select-text bg-transparent hover:bg-theme-panel focus:bg-theme-panel rounded-full py-0 px-6 outline-none text-theme-text font-bold transition-colors placeholder:opacity-40 disabled:opacity-50 ${
                        error ? 'shadow-[inset_0_0_0_2px_rgba(239,68,68,0.5)]' : ''
                    } ${className}`}
                    {...props}
                />
                {error && <span className="text-red-500 text-xs font-bold mt-1.5 px-4">{error}</span>}
            </div>
        );
    }
);
Input.displayName = 'Input';