export const GAME_CONFIG = {
    ALLOWED_BETS: [100, 200, 500, 1000, 2000, 5000, 10000],
    ALLOWED_SPEEDS: [15000, 30000, 60000, 3600000],
    ALLOWED_PLAYERS: [2, 4],
    DEFAULT_REQUIRED_PLAYERS: 2,

    DEFAULT_TURN_DURATION: 60000,
    DEFAULT_READY_DURATION: 30000,
    ROOM_LIFETIME_MS: 86400000,
    JOIN_COOLDOWN_MS: 180000,

    ECONOMY: {
        FEE_RATE: 0.10,
        DRAW_PENALTY: 0.30,
        DEV_MONEY_AMOUNT: 500
    },

    RULES: {
        WINNING_SCORE: 11,
        CAPTURE_TARGET_SUM: 11
    },
    SCORING: {
        LOCAL: {
            MOST_CARDS: 2,
            MOST_CLUBS: 1,
            TEN_OF_DIAMONDS: 1,
            TWO_OF_CLUBS: 1
        },
        CLASSIC: {
            SUR: 5,
            MOST_CLUBS: 7,
            TEN_OF_DIAMONDS: 3,
            TWO_OF_CLUBS: 2,
            ACE_OR_JACK: 1
        }
    },

    ANIMATION: {
        DURATION: {
            DEAL_TABLE: 300,
            DEAL_HAND: 300,
            PLAY: 400,
            CAPTURE: 500,
            SWEEP: 600
        },
        DELAY: {
            BETWEEN_DEALS: 150,
            THINKING_PAUSE: 200,
            BEFORE_CAPTURE: 600,
            SWEEP_WAIT: 600
        }
    }
} as const;

export type GameConfigType = typeof GAME_CONFIG;

export const UI_CONFIG: { 
    SPEED_UI: Record<GameConfigType['ALLOWED_SPEEDS'][number], { labelKey: string; icon: string }> 
} = {
    SPEED_UI: {
        15000: { labelKey: 'speed_fast', icon: '⚡' },
        30000: { labelKey: 'speed_normal', icon: '⏱' },
        60000: { labelKey: 'speed_slow', icon: '☕' },
        3600000: { labelKey: 'speed_test', icon: '🧪' }
    }
} as const;