'use client';

import React from 'react';

interface AppleToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export function AppleToggle({ checked, onChange }: AppleToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { 
                e.preventDefault(); 
                onChange(!checked); 
            }}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none shadow-inner border border-black/5 ${
                checked ? 'bg-blue-500' : 'bg-black/10'
            }`}
        >
            <span
                className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                    checked ? 'translate-x-7' : 'translate-x-1'
                }`}
            />
        </button>
    );
}