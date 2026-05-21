import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { CarouselPicker, PickerOption } from './CarouselPicker';
import { InfoRow } from '../lists/InfoRow';

export interface ExpandableCarouselRowProps {
    label: string | React.ReactNode;
    options: PickerOption[];
    value: string;
    onChange: (id: string) => void;
    morphId: string;
    requireConfirm?: boolean;
    className?: string;
}

export function ExpandableCarouselRow({
    label, options, value, onChange, morphId, className = ''
}: ExpandableCarouselRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        if (isOpen) setTempValue(value);
    }, [isOpen, value]);

    const activeId = isOpen ? tempValue : value;
    const activeOption = options.find(o => o.id === activeId) || options[0];

    const handleCarouselChange = (id: string) => setTempValue(id);

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(tempValue);
        setIsOpen(false);
    };

    return (
        <motion.div layout className={`w-full flex flex-col ${className}`}>

            {/* !!! Зачем здесь z-10? Без него работает */}
            <InfoRow onClick={() => setIsOpen(!isOpen)} className="relative z-10">
                <motion.div layout="position" className="flex items-center gap-3 flex-1 min-w-0">
                    {label}
                </motion.div>

                <AnimatePresence mode="popLayout">
                    {!isOpen ? (
                        <motion.div
                            key="thumbnail"
                            layoutId={morphId}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="min-w-0 px-4 h-8 flex items-center justify-center bg-theme-panel rounded-full shadow-sm shrink-0 ml-3"
                        >
                            <span className="text-base leading-none">{activeOption.content}</span>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="confirm-btn"
                            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                            onClick={handleConfirm}
                            className="w-8 h-8 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:shadow-lg rounded-full ml-3"
                        >
                            <Check className="w-4 h-4 text-white" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </InfoRow>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full overflow-hidden relative z-0"
                    >
                        <motion.div
                            layoutId={morphId}
                            className="w-full bg-theme-panel shadow-md rounded-3xl py-4 mt-1 border border-theme-border/30"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <CarouselPicker
                                options={options}
                                value={activeId}
                                onChange={handleCarouselChange}
                                onCenterClick={undefined}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}