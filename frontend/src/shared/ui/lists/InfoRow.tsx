import { motion, Transition } from "framer-motion";
import React from "react";

// Вынести в отдельный файл!!!
const springTransition = { 
    type: 'spring', 
    stiffness: 350, 
    damping: 30 
} as const satisfies Transition;

interface InfoRowProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'default' | 'none';
}

export function InfoRow({ children, onClick, className = '', variant = 'default' }: InfoRowProps) {
    const padding = variant === 'default' ? 'px-3 py-3' : '';
    
    return (
        <motion.div 
            layout
            transition={springTransition}
            onClick={onClick} 
            className={`flex items-center justify-between min-h-12 w-full rounded-[20px] transition-colors ${
                onClick ? 'cursor-pointer hover:bg-theme-main active:opacity-70' : ''
            } ${padding} ${className}`}
        >
            {children}
        </motion.div>
    );
}
