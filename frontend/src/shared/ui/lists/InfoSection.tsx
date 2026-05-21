import React from "react";
import { motion, Transition } from "framer-motion";
import { sharedSpringTransition } from "@/shared/ui/animations/MorphingCapsule";

// Вынести в отдельный файл!!!
const springTransition = { 
    type: 'spring', 
    stiffness: 350, 
    damping: 30 
} as const satisfies Transition;

interface InfoSectionProps {
    title?: string;
    footer?: string;
    children: React.ReactNode;
    className?: string;
}

export function InfoSection({ title, footer, children, className = '' }: InfoSectionProps) {
    return (
        <motion.div layout transition={springTransition} className={`flex flex-col ${className}`}>
            {title && (
                <motion.h3 layout="position" transition={springTransition} className="uppercase text-[11px] sm:text-xs font-bold text-theme-muted ml-4 mb-2 tracking-wider">
                    {title}
                </motion.h3>
            )}
            
            <motion.div 
                layout 
                transition={sharedSpringTransition} 
                className="bg-theme-panel rounded-[28px] flex flex-col p-1"
            >
                {children}
            </motion.div>

            {footer && (
                <motion.p layout="position" transition={springTransition} className="text-[11px] sm:text-xs text-theme-muted ml-4 mt-2 font-medium leading-snug">
                    {footer}
                </motion.p>
            )}
        </motion.div>
    );
}
