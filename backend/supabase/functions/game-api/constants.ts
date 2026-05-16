export const GAME_CONFIG = {
    ALLOWED_BETS: [100, 200, 500, 1000, 2000, 5000, 10000],
    ALLOWED_SPEEDS: [15000, 30000, 60000],
    ALLOWED_PLAYERS: [2, 4],
    DEFAULT_TURN_DURATION: 60000,
    DEFAULT_READY_DURATION: 30000,
    // Компенсация времени для UI-анимаций (в мс)
    ANIMATION_DELAYS: {
        PLAY_CARD: 500,    // Выброс карты из руки на стол
        CAPTURE: 1600,     // Ожидание + полет карт в стопку взяток
        DEAL_CARDS: 2000   // Анимация раздачи новых карт
    }
} as const;