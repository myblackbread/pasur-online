import React from 'react';
import { motion } from 'framer-motion';
import { InfiniteCarousel } from './InfiniteCarousel';

export interface PickerOption {
    id: string;
    content: React.ReactNode; 
    description?: React.ReactNode;
}

export interface CarouselPickerProps {
    options: PickerOption[];
    value: string;
    onChange: (id: string) => void;
    onCenterClick?: () => void;
}

export function CarouselPicker({ options, value, onChange, onCenterClick }: CarouselPickerProps) {
    const activeIndex = Math.max(0, options.findIndex(o => o.id === value));

    return (
        <div className="w-full flex flex-col items-center">
            <InfiniteCarousel 
                items={options} 
                activeIndex={activeIndex} 
                onChange={(idx) => onChange(options[idx].id)} 
                onCenterClick={onCenterClick}
                itemWidth={100} 
                gap={16} 
                className="w-full h-[120px]"
            >
                {(opt, isActive) => (
                    <div className={`w-[100px] h-[100px] rounded-2xl flex flex-col items-center justify-center text-theme-text transition-all duration-300 ${
                        isActive 
                            ? 'bg-theme-panel shadow-md scale-105' 
                            : 'bg-theme-panel/50 shadow-sm opacity-80 scale-95'
                    }`}>
                        <div className="text-4xl drop-shadow-sm leading-none">{opt.content}</div>
                    </div>
                )}
            </InfiniteCarousel>
            
            <div className="mt-2 text-center px-6 h-6">
                <motion.div key={options[activeIndex].id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <p className="text-xs font-bold text-theme-primary uppercase tracking-widest">{options[activeIndex].description}</p>
                </motion.div>
            </div>
        </div>
    );
}