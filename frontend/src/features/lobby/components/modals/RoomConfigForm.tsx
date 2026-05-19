import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_CONFIG } from '@/utils/constants';
import { ExpandableCarouselRow, PickerOption } from '@/components/ui/carousel-picker';
import { SegmentRow } from '@/components/ui/SegmentRow';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { InfoRow, InfoSection, RowLabel } from '@/components/ui/InfoGroup';
import { Input } from '@/components/ui/Input';

interface RoomConfigFormProps {
    config: any;
    onChange: (updates: any) => void;
    isSearchMode: boolean;
    defaultRoomName?: string;
}

export function RoomConfigForm({ config, onChange, isSearchMode, defaultRoomName }: RoomConfigFormProps) {
    const { t } = useTranslation();

    const betOptions: PickerOption[] = useMemo(() => {
        return GAME_CONFIG.BET_OPTIONS.map(b => ({
            id: String(b),
            content: <span className="text-lg font-black text-amber-500">{b}</span>,
            description: `${b} 💰`
        }));
    }, []);

    const speedOptions: PickerOption[] = useMemo(() => {
        return GAME_CONFIG.SPEED_OPTIONS.map(s => ({
            id: String(s.value),
            content: <span className="text-xl">{s.icon}</span>,
            description: t(s.labelKey)
        }));
    }, [t]);

    return (
        <div className="w-full">
            <h3 className="text-2xl font-black text-theme-text mb-6 px-2">
                {isSearchMode ? t('modal_search_title', 'Фильтры поиска') : t('modal_setup_title', 'Новый стол')}
            </h3>

            <InfoSection title={t('modal_rules_label', 'Основные')}>
                <SegmentRow
                    options={[
                        { value: 'classic', label: '🏛️ ' + t('rule_classic') },
                        { value: 'local', label: '🏡 ' + t('rule_local') }
                    ]}
                    value={config.ruleSet}
                    onChange={v => onChange({ ruleSet: v })}
                />

                <SegmentRow
                    options={[
                        { value: 2, label: '👥 2 Игрока' },
                        { value: 4, label: '👨‍👩‍👧‍👦 4 Игрока' }
                    ]}
                    value={config.players}
                    onChange={v => onChange({ players: v })}
                />
            </InfoSection>

            <InfoSection title={t('modal_modifiers', 'Дополнительно')}>
                {!isSearchMode && (
                    <InfoRow className="px-3">
                        <div className="flex-1 min-w-0">
                            <Input
                                value={config.name}
                                onChange={(e) => onChange({ name: e.target.value })}
                                placeholder={defaultRoomName}
                                maxLength={20}
                                // Убираем лишние паддинги внутри инпута, если они мешают
                                className="!px-0 !bg-transparent"
                            />
                        </div>
                    </InfoRow>
                )}

                <ExpandableCarouselRow
                    morphId="config-bet-morph"
                    label={<RowLabel icon="💰" iconBg="bg-amber-500" title={t('modal_bet_label', 'Ставка')} />}
                    options={betOptions}
                    value={String(config.bet)}
                    onChange={(val) => onChange({ bet: Number(val) })}
                    requireConfirm={true}
                />

                <ExpandableCarouselRow
                    morphId="config-speed-morph"
                    label={<RowLabel icon="⏱" iconBg="bg-blue-500" title={t('modal_speed_label', 'Таймер хода')} />}
                    options={speedOptions}
                    value={String(config.speed)}
                    onChange={(val) => onChange({ speed: Number(val) })}
                    requireConfirm={true}
                />

                <SwitchRow
                    title={t('modal_strict_mode')}
                    icon="⚖️" iconBg="bg-red-500"
                    checked={config.isStrict}
                    onChange={v => onChange({ isStrict: v })}
                />
                {config.ruleSet === 'local' && (
                    <SwitchRow
                        title={t('modal_sudden_death')}
                        icon="⚡" iconBg="bg-amber-500"
                        checked={config.isSuddenDeath}
                        onChange={v => onChange({ isSuddenDeath: v })}
                    />
                )}
                <SwitchRow
                    title={t('modal_private_table')}
                    icon="🔒" iconBg="bg-slate-500"
                    checked={config.isPrivate}
                    onChange={v => onChange({ isPrivate: v })}
                />
            </InfoSection>
        </div>
    );
}