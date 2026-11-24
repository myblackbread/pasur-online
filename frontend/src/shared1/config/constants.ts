import { GameConfigType } from "@/shared/constants"; 

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