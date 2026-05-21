"use client";

import React from 'react';

export type AlertButtonStyle = 'default' | 'destructive' | 'cancel';

export interface AlertButton<T = unknown> {
    text: string;
    style?: AlertButtonStyle;
    onPress?: (presenting?: T) => void;
}

export interface AlertOptions<T = unknown> {
    title: string;
    message?: string;
    presenting?: T;
    buttons: AlertButton<T>[];
}

interface AlertContextType {
    showAlert: <T = unknown>(options: AlertOptions<T>) => void;
    closeAlert: () => void;
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined);

function AlertModal({ options, onClose }: { options: AlertOptions<any>, onClose: () => void }) {
    const handleButtonPress = (button: AlertButton<any>) => {
        if (button.onPress) {
            button.onPress(options.presenting);
        }
        onClose();
    };

    return (
        <div className="bg-theme-panel p-6 sm:p-8 rounded-2xl sm:rounded-3xl max-w-sm w-full text-center shadow-xl">

            {/* Заголовок */}
            {<h3 className="text-theme-text font-black text-xl mb-2 leading-tight">
                {options.title}
            </h3>}

            {/* Текст сообщения */}
            {options.message && (
                <p className={`text-theme-text opacity-90 whitespace-pre-line ${options.title ? 'mb-6 text-base' : 'mb-8 font-bold text-lg'} leading-tight`}>
                    {options.message}
                </p>
            )}

            <div className="flex flex-col gap-3">
                {options.buttons.map((button, index) => {
                    let buttonClass = "";
                    switch (button.style) {
                        case 'destructive': // "Красная" кнопка
                            buttonClass = "bg-red-500 text-white hover:bg-red-600 border-transparent shadow-md";
                            break;
                        case 'cancel': // Второстепенная
                            buttonClass = "bg-theme-main text-theme-text hover:opacity-80";
                            break;
                        case 'default':
                        default: // Главная акцентная кнопка
                            buttonClass = "bg-theme-primary text-white hover:opacity-80 border-transparent shadow-md";
                            break;
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleButtonPress(button)}
                            className={`w-full py-4 px-6 rounded-full font-black transition-all ${buttonClass}`}
                        >
                            {button.text}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

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