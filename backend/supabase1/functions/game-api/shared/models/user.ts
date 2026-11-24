/** Пользовательские настройки профиля */
export interface UserSettings {
    /** Биологический пол */
    gender: 'male' | 'female';
    /** Эмодзи, используемый в качестве базового аватара */
    avatarEmoji: string;
    /** Массив ID заблокированных пользователей */
    blockedUids: string[];
    /** Имя пользователя (никнейм) */
    displayName: string;
    /** Включен ли режим инкогнито */
    isIncognito: boolean;
}

/** Модель пользователя */
export interface User {
    /** Уникальный ID пользователя */
    id: string;
    /** Текущий баланс денег (подтягивается из кошелька) */
    balance: number;
    /** Является ли пользователь администратором */
    isAdmin: boolean;
    /** Флаг, указывающий, что аккаунт удален */
    isDeleted: boolean | null;
    /** Массив ID комнат, в которых пользователь сейчас числится */
    activeRooms: string[];
    /** Настройки профиля пользователя */
    settings: UserSettings;
}