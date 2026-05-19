import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { CarouselPicker, PickerOption } from './CarouselPicker';

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
    label, options, value, onChange, morphId, requireConfirm = false, className = ''
}: ExpandableCarouselRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        if (isOpen) setTempValue(value);
    }, [isOpen, value]);

    const activeId = (requireConfirm && isOpen) ? tempValue : value;
    const activeOption = options.find(o => o.id === activeId) || options[0];

    const handleCarouselChange = (id: string) => {
        if (requireConfirm) setTempValue(id);
        else onChange(id);
    };

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(tempValue); 
        setIsOpen(false);
    };

    return (
        <motion.div layout className={`w-full flex flex-col ${className}`}>
            
            {/* ШАПКА: Без жесткого фона, сливается с InfoSection, выделяется при ховере */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full h-12 px-3 rounded-full cursor-pointer hover:bg-theme-panel transition-colors relative z-10"
            >
                <motion.div layout="position" className="flex items-center gap-3">
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
                            className="w-8 h-8 flex items-center justify-center bg-theme-panel rounded-full shadow-sm"
                        >
                            <span className="text-base leading-none">{activeOption.content}</span>
                        </motion.div>
                    ) : requireConfirm ? (
                        <motion.button
                            key="confirm-btn"
                            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                            onClick={handleConfirm}
                            className="w-8 h-8 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:shadow-lg rounded-full"
                        >
                            <Check className="w-4 h-4 text-white" />
                        </motion.button>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Выпадающая карусель */}
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
                            className="w-full bg-theme-panel shadow-md rounded-[24px] py-4 mt-1 border border-theme-border/30"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <CarouselPicker 
                                options={options} 
                                value={activeId} 
                                onChange={handleCarouselChange} 
                                onCenterClick={!requireConfirm ? () => setIsOpen(false) : undefined}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}