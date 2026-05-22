import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_CONFIG } from '@/shared/config/constants';
import { ExpandableCarouselRow, PickerOption } from '@/shared/ui/carousel';
import { SegmentRow } from '@/shared/ui/inputs/SegmentRow';
import { SwitchRow } from '@/shared/ui/lists/SwitchRow';
import { InfoSection } from '@/shared/ui/lists/InfoSection';
import { RowLabel } from '@/shared/ui/lists/RowLabel';
import { InputRow } from '@/shared/ui/inputs/InputRow';

interface RoomConfigFormProps {
    config: any;
    onChange: (updates: any) => void;
    defaultRoomName?: string | null;
}

export function RoomConfigForm({ config, onChange, defaultRoomName }: RoomConfigFormProps) {
    const { t } = useTranslation();

    const betOptions: PickerOption[] = useMemo(() => {
        return GAME_CONFIG.BET_OPTIONS.map(b => ({
            id: String(b),
            // Задаем text-2xl и truncate, чтобы даже 10000 гарантированно вмещалось в карточку
            content: <span className="font-black text-amber-500 text-2xl truncate">{b}</span>,
            thumbnail: <span className="font-bold text-amber-500">{b} 💰</span>, 
            description: `${b} 💰`
        }));
    }, []);

    const speedOptions: PickerOption[] = useMemo(() => {
        return GAME_CONFIG.SPEED_OPTIONS.map(s => ({
            id: String(s.value),
            // Внутри карусели иконка будет крупной
            content: <span className="text-4xl">{s.icon}</span>,
            // В свернутом виде возвращаем старый компактный вариант (только иконка)
            thumbnail: <span className="text-xl">{s.icon}</span>,
            description: t(s.labelKey)
        }));
    }, [t]);

    return (
        <div className="w-full">
            <div className='flex flex-col gap-4 mt-2'>
                {defaultRoomName !== null && (
                    <InfoSection
                        title={t('modal_modifiers')}
                        items={[{
                            id: '1',
                            interactive: true,
                            variant: 'default',
                            content: (
                                <InputRow
                                    value={config.name}
                                    onChange={(e) => onChange({ name: e.target.value })}
                                    placeholder={defaultRoomName}
                                    maxLength={20}
                                />
                            )
                        }]}
                    />
                )}

                <InfoSection
                    title={t('modal_rules_label')}
                    items={[
                        {
                            id: '2',
                            interactive: false,
                            variant: 'none',
                            content: (<SegmentRow
                                options={[
                                    { value: 'classic', label: '🏛️ ' + t('rule_classic') },
                                    { value: 'local', label: '🏡 ' + t('rule_local') }
                                ]}
                                value={config.ruleSet}
                                onChange={v => onChange({ ruleSet: v })}
                            />)
                        },
                        {
                            id: '3',
                            interactive: false,
                            variant: 'none',
                            content: (<SegmentRow
                                options={[
                                    { value: 2, label: '👥 2 Игрока' },
                                    { value: 4, label: '👨‍👩‍👧‍👦 4 Игрока' }
                                ]}
                                value={config.players}
                                onChange={v => onChange({ players: v })}
                            />)
                        }
                    ]}
                />

                <InfoSection
                    title={t('modal_rules_label')} // Возможно тут опечатка и должно быть t('modal_game_settings_label')?
                    items={[
                        {
                            id: '4',
                            interactive: true,
                            variant: 'default',
                            content: (<ExpandableCarouselRow
                                morphId="config-bet-morph"
                                label={<RowLabel icon="💰" iconBg="bg-amber-500" title={t('modal_bet_label', 'Ставка')} />}
                                options={betOptions}
                                value={String(config.bet)}
                                onChange={(val) => onChange({ bet: Number(val) })}
                            />)
                        },
                        {
                            id: '5',
                            interactive: true,
                            variant: 'default',
                            content: (<ExpandableCarouselRow
                                morphId="config-speed-morph"
                                label={<RowLabel icon="⏱" iconBg="bg-blue-500" title={t('modal_speed_label', 'Таймер хода')} />}
                                options={speedOptions}
                                value={String(config.speed)}
                                onChange={(val) => onChange({ speed: Number(val) })}
                            />)
                        },
                    ]}
                />


                <InfoSection
                    title={t('modal_modifiers')}
                    items={[
                        {
                            id: '6',
                            interactive: true,
                            variant: 'default',
                            content: (<SwitchRow
                                title={t('modal_strict_mode')}
                                icon="⚖️" iconBg="bg-red-500"
                                checked={config.isStrict}
                                onChange={v => onChange({ isStrict: v })}
                            />)
                        },
                        config.ruleSet === 'local' ? {
                            id: '7',
                            interactive: true,
                            variant: 'default',
                            content: (
                                <SwitchRow
                                    title={t('modal_sudden_death')}
                                    icon="⚡" iconBg="bg-amber-500"
                                    checked={config.isSuddenDeath}
                                    onChange={v => onChange({ isSuddenDeath: v })}
                                />
                            )
                        } : null,
                        {
                            id: '8',
                            interactive: true,
                            variant: 'default',
                            content: (<SwitchRow
                                title={t('modal_private_table')}
                                icon="🔒" iconBg="bg-slate-500"
                                checked={config.isPrivate}
                                onChange={v => onChange({ isPrivate: v })}
                            />)
                        }
                    ]}
                />
            </div>
        </div >
    );
}