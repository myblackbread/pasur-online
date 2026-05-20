import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, Transition } from 'framer-motion';
import { Info, X } from 'lucide-react';

const springTransition = { 
    type: 'spring', 
    stiffness: 350, 
    damping: 30 
} as const satisfies Transition;

interface InfoSectionProps {
    title?: string;
    footer?: string;
    children: ReactNode;
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
                transition={springTransition} 
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

interface InfoRowProps {
    children: ReactNode;
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

interface RowLabelProps {
    icon?: ReactNode;
    iconBg?: string;
    title: ReactNode;
    subtitle?: ReactNode;
}

export function RowLabel({ icon, iconBg = 'bg-theme-primary', title, subtitle }: RowLabelProps) {
    // ... логика isExpanded остается без изменений ...
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkOverflow = () => {
            if (textRef.current && !isExpanded) {
                setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight + 2);
            }
        };
        checkOverflow();
        const timeout = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => { clearTimeout(timeout); window.removeEventListener('resize', checkOverflow); };
    }, [subtitle, isExpanded]);

    const handleToggle = (e: React.MouseEvent) => {
        if (isOverflowing || isExpanded) {
            e.stopPropagation();
            e.preventDefault();
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && (
                <motion.div layout="position" transition={springTransition} className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${iconBg}`}>
                    <span className="text-sm leading-none">{icon}</span>
                </motion.div>
            )}
            <div className="flex flex-col justify-center text-left flex-1 min-w-0">
                <motion.span layout="position" transition={springTransition} className="font-bold text-sm text-theme-text leading-tight break-words">
                    {title}
                </motion.span>
                
                {subtitle && (
                    <motion.div layout transition={springTransition} className={`flex items-end gap-2 mt-0.5 w-full min-w-0 ${isOverflowing || isExpanded ? 'cursor-pointer' : ''}`} onClick={handleToggle}>
                        <motion.div layout transition={springTransition} className="flex-1 min-w-0">
                            <div ref={textRef} className={`text-[11px] sm:text-xs text-theme-muted font-medium leading-snug break-words whitespace-normal ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {subtitle}
                            </div>
                        </motion.div>
                        
                        {(isOverflowing || isExpanded) && (
                            <motion.div layout="position" transition={springTransition} className="shrink-0 text-theme-primary flex items-center justify-center py-1">
                                {isExpanded ? <X className="w-4 h-4"/> : <Info className="w-4 h-4"/>}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}