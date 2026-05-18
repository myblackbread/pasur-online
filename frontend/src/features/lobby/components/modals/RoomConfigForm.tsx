import React from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_CONFIG } from '@/utils/constants';
import { AppleToggle } from '@/components/ui/AppleToggle';

interface RoomConfigFormProps {
    config: any;
    onChange: (updates: any) => void;
    isSearchMode: boolean;
    defaultRoomName?: string;
}

export function RoomConfigForm({ config, onChange, isSearchMode, defaultRoomName }: RoomConfigFormProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-theme-text mb-2">
                {isSearchMode ? t('modal_search_title', 'Фильтры поиска') : t('modal_setup_title', 'Новый стол')}
            </h3>

            {/* 1. РЕЖИМ ИГРЫ (Подняли на самый верх) */}
            <div>
                <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">
                    {t('modal_rules_label', 'Режим игры')}
                </label>
                <div className="flex bg-theme-main p-1 rounded-2xl border border-theme-border/50 shadow-inner">
                    <button 
                        onClick={() => onChange({ ruleSet: 'classic', isSuddenDeath: false })}
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all ${config.ruleSet === 'classic' ? 'bg-theme-primary text-white shadow-md' : 'text-theme-text opacity-60 hover:opacity-100'}`}
                    >
                        🏛️ {t('rule_classic')}
                    </button>
                    <button 
                        onClick={() => onChange({ ruleSet: 'local' })}
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all ${config.ruleSet === 'local' ? 'bg-theme-primary text-white shadow-md' : 'text-theme-text opacity-60 hover:opacity-100'}`}
                    >
                        🏡 {t('rule_local')}
                    </button>
                </div>
            </div>

            {/* 2. ИМЯ СТОЛА (Псевдоним) */}
            {!isSearchMode && (
                <div>
                    <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">
                        {t('modal_name_label', 'Псевдоним стола')}
                    </label>
                    <input
                        type="text"
                        value={config.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder={defaultRoomName}
                        maxLength={20}
                        className="w-full bg-theme-main shadow-inner rounded-xl py-3 px-4 focus:ring-2 focus:ring-theme-primary outline-none text-theme-text font-bold transition-shadow placeholder:opacity-30"
                    />
                </div>
            )}

            {/* 3. КОЛИЧЕСТВО ИГРОКОВ */}
            <div>
                <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">
                    {t('modal_players_label', 'Количество игроков')}
                </label>
                <div className="flex bg-theme-main p-1 rounded-2xl border border-theme-border/50 shadow-inner">
                    <button 
                        onClick={() => onChange({ players: 2 })}
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all ${config.players === 2 ? 'bg-blue-500 text-white shadow-md' : 'text-theme-text opacity-60 hover:opacity-100'}`}
                    >
                        👥 2
                    </button>
                    <button 
                        onClick={() => onChange({ players: 4 })}
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all ${config.players === 4 ? 'bg-blue-500 text-white shadow-md' : 'text-theme-text opacity-60 hover:opacity-100'}`}
                    >
                        👨‍👩‍👧‍👦 4
                    </button>
                </div>
            </div>

            {/* 4. СТАВКА */}
            <div>
                <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">
                    {t('modal_bet_label', 'Ставка')}
                </label>
                <div className="flex flex-wrap gap-2">
                    {GAME_CONFIG.BET_OPTIONS.map(b => (
                        <button
                            key={b}
                            onClick={() => onChange({ bet: b })}
                            className={`flex-1 min-w-[70px] py-3 rounded-2xl font-black transition-all ${config.bet === b ? 'bg-amber-500 text-white shadow-md' : 'bg-theme-main text-theme-text shadow-sm hover:shadow-md'}`}
                        >
                            {b}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. ТАЙМЕР ХОДА */}
            <div>
                <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">
                    {t('modal_speed_label', 'Таймер хода')}
                </label>
                <div className="flex gap-2">
                    {GAME_CONFIG.SPEED_OPTIONS.map(s => (
                        <button
                            key={s.value}
                            onClick={() => onChange({ speed: s.value })}
                            className={`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center transition-all ${config.speed === s.value ? 'bg-theme-primary text-white shadow-md' : 'bg-theme-main text-theme-text shadow-sm hover:shadow-md'}`}
                        >
                            <span className="text-2xl mb-1">{s.icon}</span>
                            <span className="text-xs font-bold whitespace-nowrap">{t(s.labelKey)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 6. ДОПОЛНИТЕЛЬНЫЕ ПАРАМЕТРЫ */}
            <div className="flex flex-col gap-1 bg-theme-main shadow-inner p-2 rounded-3xl">
                <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-theme-panel rounded-2xl transition-colors">
                    <span className="font-bold text-theme-text">⚖️ {t('modal_strict_mode')}</span>
                    <AppleToggle checked={config.isStrict} onChange={v => onChange({ isStrict: v })} />
                </label>
                {config.ruleSet === 'local' && (
                    <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-theme-panel rounded-2xl transition-colors">
                        <span className="font-bold text-theme-text">⚡ {t('modal_sudden_death')}</span>
                        <AppleToggle checked={config.isSuddenDeath} onChange={v => onChange({ isSuddenDeath: v })} />
                    </label>
                )}
                <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-theme-panel rounded-2xl transition-colors">
                    <span className="font-bold text-theme-text">🔒 {t('modal_private_table')}</span>
                    <AppleToggle checked={config.isPrivate} onChange={v => onChange({ isPrivate: v })} />
                </label>
            </div>
        </div>
    );
}