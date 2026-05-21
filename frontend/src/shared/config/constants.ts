export const GAME_CONFIG = {
    BET_OPTIONS: [100, 200, 500, 1000, 2000, 5000, 10000],
    SPEED_OPTIONS: [
        { value: 15000, labelKey: 'speed_fast', icon: '⚡' },
        { value: 30000, labelKey: 'speed_normal', icon: '⏱' },
        { value: 60000, labelKey: 'speed_slow', icon: '☕' }
    ],
    DEFAULT_TURN_DURATION: 60000
} as const;