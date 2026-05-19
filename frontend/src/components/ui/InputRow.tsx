import React from 'react';
import { InfoRow, RowLabel } from './InfoGroup';

interface InputRowProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    icon?: string;
    iconBg?: string;
    label?: string;
}

export const InputRow = React.forwardRef<HTMLInputElement, InputRowProps>(
    ({ className = '', error, icon, iconBg, label, ...props }, ref) => {
        return (
            <InfoRow className={`px-3 ${className}`}>
                {(icon || label) && (
                    <div className="shrink-0 mr-3">
                        <RowLabel icon={icon} iconBg={iconBg} title={label} />
                    </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <input
                        ref={ref}
                        className={`w-full h-12 bg-transparent outline-none text-theme-text font-bold placeholder:opacity-40 disabled:opacity-50 ${
                            error ? 'text-red-500' : ''
                        }`}
                        {...props}
                    />
                    {error && <span className="text-red-500 text-[10px] font-bold mt-[-8px] mb-2">{error}</span>}
                </div>
            </InfoRow>
        );
    }
);

InputRow.displayName = 'InputRow';