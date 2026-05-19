import React from 'react';

export interface SegmentOption<T> {
    value: T;
    label: React.ReactNode;
}

interface SegmentedControlProps<T> {
    options: SegmentOption<T>[];
    value: T | null;
    onChange: (val: T) => void;
    className?: string;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange, className = '' }: SegmentedControlProps<T>) {
    return (
        <div className={`flex gap-1 w-full ${className}`}>
            {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={String(opt.value)}
                        onClick={(e) => { e.stopPropagation(); onChange(opt.value); }}
                        type="button"
                        className={`flex-1 h-12 rounded-full text-sm font-black transition-all flex items-center justify-center gap-2 ${
                            isActive
                                ? 'bg-theme-primary text-white shadow-md'
                                : 'text-theme-text opacity-60 hover:opacity-100 hover:bg-theme-panel'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}