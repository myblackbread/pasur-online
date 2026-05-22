import { motion } from "framer-motion";
import React from "react";

export function InfoRow({
    children,
    onClick,
    className = '',
    variant = 'default'
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'default' | 'none';
}) {
    const padding = variant === 'default' ? 'px-3' : '';

    return (
        <motion.div
            onClick={onClick}
            className={`flex items-center justify-between min-h-12 w-full transition-colors ${onClick ? 'cursor-pointer transition-colors active:bg-white/50' : ''
                } ${padding} ${className}`}
        >
            {children}
        </motion.div>
    );
}