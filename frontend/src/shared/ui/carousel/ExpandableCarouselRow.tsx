import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CarouselPicker, PickerOption } from './CarouselPicker';
import { Check } from 'lucide-react';

interface ExpandableCarouselRowProps {
    label: string | React.ReactNode;
    options: PickerOption[];
    value: string;
    onChange: (id: string) => void;
    morphId: string;
    className?: string;
    renderConfirmButton?: (onConfirm: (e: React.MouseEvent) => void) => React.ReactNode;
}

export function ExpandableCarouselRow({
    label,
    options,
    value,
    onChange,
    morphId,
    className = '',
    renderConfirmButton
}: ExpandableCarouselRowProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [tempValue, setTempValue] = React.useState(value);

    // Синхронизируем стейт при открытии без useEffect
    const handleToggle = () => {
        if (!isOpen) {
            setTempValue(value);
        }
        setIsOpen(!isOpen);
    };

    const activeId = isOpen ? tempValue : value;
    const activeOption = options.find(o => o.id === activeId) || options[0];

    const handleCarouselChange = (id: string) => setTempValue(id);

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(tempValue);
        setIsOpen(false);
    };

    return (
        <motion.div layout layoutRoot className={`w-full flex flex-col ${className}`}>
            <div
                onClick={handleToggle}
                className="flex items-center justify-between w-full h-fit transition-colors relative cursor-pointer"
            >
                <div className="flex-grow">
                    {label}
                </div>

                <AnimatePresence mode="popLayout">
                    {!isOpen ? (
                        <motion.div
                            key="thumbnail"
                            layoutId={morphId}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="shrink-0" // Защита от сжатия длинным текстом
                        >
                            {/* Если есть отдельная миниатюра — показываем её, иначе основной контент */}
                            {activeOption.thumbnail || activeOption.content}
                        </motion.div>
                    ) : (
                        <div className="shrink-0 p-2 flex items-center justify-center">
                            {renderConfirmButton ? (
                                renderConfirmButton(handleConfirm)
                            ) : (
                                <motion.button
                                    key="confirm-btn"
                                    initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                    onClick={handleConfirm}
                                    className="h-full w-full bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:shadow-lg rounded-full"
                                >
                                    <Check
                                        className="w-full h-full text-white"
                                        style={{ transform: `scale(${Math.sqrt(0.5)})` }}
                                    />
                                </motion.button>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full overflow-hidden relative"
                    >
                        <motion.div
                            layoutId={morphId}
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