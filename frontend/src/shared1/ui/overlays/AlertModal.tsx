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

export function AlertModal({ options, onClose }: { options: AlertOptions<any>, onClose: () => void }) {
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