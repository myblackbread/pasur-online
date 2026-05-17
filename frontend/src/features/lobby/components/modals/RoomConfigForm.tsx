import React from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_CONFIG } from '@/utils/constants';
import { AppleToggle } from '@/components/ui/AppleToggle';

interface RoomConfigFormProps {
    config: any;
    onChange: (updates: any) => void;
    isSearchMode: boolean;
}

export function RoomConfigForm({ config, onChange, isSearchMode }: RoomConfigFormProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-theme-text mb-2">
                {isSearchMode ? "Фильтры поиска" : t('modal_setup_title')}
            </h3>

            <div>
                <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">{t('modal_bet_label')}</label>
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

            <div>
                <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">{t('modal_speed_label')}</label>
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

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-theme-main shadow-sm p-4 rounded-3xl flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onChange({ players: config.players === 2 ? 4 : 2 })}>
                    <div className="text-3xl">{config.players === 2 ? '👥' : '👨‍👩‍👧‍👦'}</div>
                    <div className="font-bold text-sm text-theme-text">{config.players} {t('modal_players_count')}</div>
                </div>
                <div className="bg-theme-main shadow-sm p-4 rounded-3xl flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                        const newRule = config.ruleSet === 'local' ? 'classic' : 'local';
                        onChange({ ruleSet: newRule, isSuddenDeath: newRule === 'classic' ? false : config.isSuddenDeath });
                    }}
                >
                    <div className="text-3xl">{config.ruleSet === 'local' ? '🏡' : '🏛️'}</div>
                    <div className="font-bold text-sm text-theme-text">{config.ruleSet === 'local' ? t('rule_local') : t('rule_classic')}</div>
                </div>
            </div>

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