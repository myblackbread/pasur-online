import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InfiniteCarousel } from './InfiniteCarousel';

// Актуализированный интерфейс (поддерживает и thumbnail для строки, и content для карусели)
export interface PickerOption {
    id: string;
    content: React.ReactNode;
    thumbnail?: React.ReactNode;
    description?: React.ReactNode;
}

export interface CarouselPickerProps {
    options: PickerOption[];
    value: string;
    onChange: (id: string) => void;
    onCenterClick?: () => void;
    itemWidth?: number;
    gap?: number;
    className?: string;
    // Опциональные рендер-функции для полной отвязки от дизайна
    renderItem?: (item: PickerOption, isActive: boolean) => React.ReactNode;
    renderDescription?: (item: PickerOption) => React.ReactNode;
}

export function CarouselPicker({ 
    options, 
    value, 
    onChange, 
    onCenterClick,
    itemWidth = 100,
    gap = 16,
    className = '',
    renderItem,
    renderDescription
}: CarouselPickerProps) {
    const activeIndex = Math.max(0, options.findIndex(o => o.id === value));

    // Дефолтный рендер элемента, если не передан кастомный
    const defaultRenderItem = (opt: PickerOption, isActive: boolean) => (
        <div className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center text-theme-text transition-all duration-300 ${
            isActive 
                ? 'bg-theme-panel shadow-md scale-105' // Вернул ваши родные классы
                : 'bg-theme-panel/50 shadow-sm opacity-80 scale-95'
        }`}>
            {/* Убрали text-4xl. Теперь контент может быть любого размера */}
            <div className="w-full px-2 flex items-center justify-center drop-shadow-sm leading-none overflow-hidden">
                {opt.content}
            </div>
        </div>
    );

    // Дефолтный рендер описания
    const defaultRenderDescription = (opt: PickerOption) => (
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
            {opt.description}
        </p>
    );

    return (
        <div className={`w-full flex flex-col items-center ${className}`}>
            <InfiniteCarousel 
                items={options} 
                activeIndex={activeIndex} 
                onChange={(idx) => onChange(options[idx].id)} 
                onCenterClick={onCenterClick}
                itemWidth={itemWidth} 
                gap={gap} 
                className="w-full h-[120px]"
            >
                {(opt, isActive) => renderItem ? renderItem(opt, isActive) : defaultRenderItem(opt, isActive)}
            </InfiniteCarousel>
            
            <div className="mt-2 text-center px-6 h-6">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={options[activeIndex].id} 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderDescription ? renderDescription(options[activeIndex]) : defaultRenderDescription(options[activeIndex])}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}