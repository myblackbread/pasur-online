"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type AlertType = 'alert' | 'confirm';

interface AlertState {
    type: AlertType;
    message: string;
    onConfirm?: () => void;
}

interface AlertContextType {
    showAlert: (message: string) => void;
    showConfirm: (message: string, onConfirm: () => void) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const [alertState, setAlertState] = useState<AlertState | null>(null);

    const showAlert = useCallback((message: string) => {
        setAlertState({ type: 'alert', message });
    }, []);

    const showConfirm = useCallback((message: string, onConfirm: () => void) => {
        setAlertState({ type: 'confirm', message, onConfirm });
    }, []);

    const close = () => setAlertState(null);

    const handleConfirm = () => {
        if (alertState?.onConfirm) alertState.onConfirm();
        close();
    };

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            
            {alertState && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 touch-none overscroll-none pointer-events-auto animate-in fade-in duration-200 safe-padding"
                    style={{ overscrollBehavior: 'none' }}
                >
                    <div className="bg-theme-panel border-4 border-theme-border p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="text-4xl mb-4">
                            {alertState.type === 'confirm' ? '🤔' : '⚠️'}
                        </div>
                        <h3 className="text-2xl font-black mb-2 text-theme-text">
                            {alertState.type === 'confirm' ? t('alert_confirm') : t('alert_warning')}
                        </h3>
                        <p className="text-theme-text font-bold mb-8 opacity-90 whitespace-pre-line text-lg leading-tight">
                            {alertState.message}
                        </p>
                        
                        {alertState.type === 'alert' ? (
                            <button 
                                onClick={close} 
                                className="w-full bg-theme-primary text-white font-black py-4 rounded-xl hover:opacity-80 transition-opacity shadow-lg"
                            >
                                {t('alert_ok')}
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                <button 
                                    onClick={close} 
                                    className="flex-1 bg-theme-main border-2 border-theme-border text-theme-text font-black py-4 rounded-xl hover:opacity-80 transition-opacity"
                                >
                                    {t('alert_cancel')}
                                </button>
                                <button 
                                    onClick={handleConfirm} 
                                    className="flex-1 bg-red-500 text-white font-black py-4 rounded-xl hover:opacity-80 transition-opacity shadow-lg"
                                >
                                    {t('alert_yes')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
}

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) throw new Error("useAlert must be used within an AlertProvider");
    return context;
};