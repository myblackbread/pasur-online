import React, { ReactNode } from 'react';

interface ModalProps {
    children: ReactNode;
    onClose?: () => void;
}

export function Modal({ children, onClose }: ModalProps) {
    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center safe-padding animate-in fade-in">
            <div className="relative w-full max-w-lg max-h-full overflow-y-auto bg-theme-panel p-5 sm:p-8 rounded-[2rem] shadow-2xl border-4 border-theme-border">
                {children}
            </div>
        </div>
    );
}