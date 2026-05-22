import React from "react";
import { motion, Transition } from "framer-motion";
import { sharedSpringTransition } from "@/shared/ui/animations/MorphingCapsule";
import { Divider } from "../layout/Divider";

const springTransition = {
    type: 'spring',
    stiffness: 350,
    damping: 30
} as const satisfies Transition;

export interface InfoItem {
    id: string | number;
    content: React.ReactNode;
    interactive?: boolean;
    variant?: 'default' | 'none';
    isLast: boolean;
}

export interface InfoSectionProps {
    title?: string;
    footer?: string;
    items: (Omit<InfoItem, 'isLast'> | null)[];
    className?: string;
}

function InfoRow({
    content,
    interactive = false,
    variant = 'default',
}: Omit<InfoItem, 'id' | 'isLast'>) {
    const padding = variant === 'default' ? 'px-4' : '';

    const interactiveClasses = interactive
        ? 'transition-colors active:bg-theme-main cursor-pointer'
        : '';

    return (
        <motion.div
            // 1. ЗАМЕНИЛИ items-center на items-stretch (позволяем детям тянуться по высоте)
            className={`flex items-stretch min-h-16 w-full ${interactiveClasses} ${padding}`}
        >
            {/* 2. Добавили flex flex-col justify-center. 
                - Это выровняет обычный текст по центру (по вертикали).
                - А компоненты с h-full (как ваш SegmentedControl) наконец-то смогут занять все доступное место. */}
            <div className="flex-1 w-full flex flex-col justify-center">
                {content}
            </div>
        </motion.div>
    );
}

export function InfoSection({
    title,
    footer,
    items,
    className = ''
}: InfoSectionProps) {
    const validItems = items.filter((item): item is InfoItem => item !== null);

    return (
        <motion.div layout transition={springTransition} className={`flex flex-col gap-2 ${className}`}>
            {title && (
                <motion.h3 layout="position" transition={springTransition} className="uppercase text-[11px] sm:text-xs font-bold text-theme-muted ml-4 tracking-wider">
                    {title}
                </motion.h3>
            )}

            <motion.div
                layout
                transition={sharedSpringTransition}
                className="bg-theme-panel rounded-4xl flex flex-col overflow-hidden"
            >
                {validItems.map((item, index) => {
                    const isLast = index === validItems.length - 1;

                    return (
                        <React.Fragment key={item.id}>
                            <InfoRow
                                content={item.content}
                                interactive={item.interactive}
                                variant={item.variant}
                            />
                            {!isLast && <Divider indent={false} />} 
                        </React.Fragment>
                    );
                })}
            </motion.div>

            {footer && (
                <motion.p layout="position" transition={springTransition} className="text-[11px] sm:text-xs text-theme-muted ml-4 font-medium leading-snug">
                    {footer}
                </motion.p>
            )}
        </motion.div>
    );
}