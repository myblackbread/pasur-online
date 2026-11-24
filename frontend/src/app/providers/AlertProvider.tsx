"use client";

import React from 'react';
import { AlertModal, AlertOptions } from '@/shared1/ui/overlays/AlertModal';


interface AlertContextType {
    showAlert: <T = unknown>(options: AlertOptions<T>) => void;
    closeAlert: () => void;
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [alertState, setAlertState] = React.useState<AlertOptions<any> | null>(null);

    const showAlert = React.useCallback(function <T = unknown>(options: AlertOptions<T>) {
        setAlertState(options);
    }, []);

    const closeAlert = React.useCallback(() => {
        setAlertState(null);
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, closeAlert }}>
            {children}

            {alertState && (
                <div
                    className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto touch-none overscroll-none animate-in fade-in duration-200 safe-padding"
                    style={{ overscrollBehavior: 'none' }}
                >
                    <AlertModal
                        options={alertState}
                        onClose={closeAlert}
                    />
                </div>
            )}
        </AlertContext.Provider>
    );
}

export const useAlert = () => {
    const context = React.useContext(AlertContext);
    if (!context) throw new Error("useAlert must be used within an AlertProvider");
    return context;
};