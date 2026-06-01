import React from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_CONFIG, UI_CONFIG } from '@/shared/config/constants';
import { ExpandableCarouselRow, PickerOption } from '@/shared/ui/carousel';
import { SegmentRow } from '@/shared/ui/inputs/SegmentRow';
import { SwitchRow } from '@/shared/ui/lists/SwitchRow';
import { InfoSection } from '@/shared/ui/lists/InfoSection';
import { RowLabel } from '@/shared/ui/lists/RowLabel';
import { InputRow } from '@/shared/ui/inputs/InputRow';
import { CreateRoomPayload } from '@/shared/api/contracts/payloads';

interface RoomConfigFormProps {
    config: Partial<CreateRoomPayload>;
    onChange: (updates: Partial<CreateRoomPayload>) => void;
    defaultRoomName?: string | null;
}

export function RoomConfigForm({ config, onChange, defaultRoomName }: RoomConfigFormProps) {
    const { t } = useTranslation();

    const betOptions: PickerOption[] = React.useMemo(() => {
        return GAME_CONFIG.ALLOWED_BETS.map(b => ({
            id: String(b),
            content: <span className="font-black text-amber-500 text-2xl truncate">{b}</span>,
            thumbnail: <span className="font-bold text-amber-500">{b} 💰</span>, 
            description: `${b} 💰`
        }));
    }, []);

    const speedOptions: PickerOption[] = React.useMemo(() => {
        return GAME_CONFIG.ALLOWED_SPEEDS.map(s => ({
            id: String(s),
            content: <span className="text-4xl">{UI_CONFIG.SPEED_UI[s].icon}</span>,
            thumbnail: <span className="text-xl mr-1">{UI_CONFIG.SPEED_UI[s].icon}</span>,
            description: t(UI_CONFIG.SPEED_UI[s].labelKey)
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
                                    value={config.name || ''}
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
                                value={config.ruleSet || 'local'}
                                onChange={v => onChange({ ruleSet: v as 'local' | 'classic' })}
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
                                value={config.requiredPlayers || 2}
                                onChange={v => onChange({ requiredPlayers: v as number })}
                            />)
                        }
                    ]}
                />

                <InfoSection
                    title={t('modal_game_settings_label', 'Настройки игры')}
                    items={[
                        {
                            id: '4',
                            interactive: true,
                            variant: 'default',
                            content: (<ExpandableCarouselRow
                                morphId="config-bet-morph"
                                label={<RowLabel icon="💰" iconBg="bg-amber-500" title={t('modal_bet_label', 'Ставка')} />}
                                options={betOptions}
                                value={String(config.betAmount || 100)}
                                onChange={(val) => onChange({ betAmount: Number(val) })}
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
                                value={String(config.turnDuration || 60000)}
                                onChange={(val) => onChange({ turnDuration: Number(val) })}
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
                                checked={!!config.isStrict}
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
                                    checked={!!config.isSuddenDeath}
                                    onChange={v => onChange({ isSuddenDeath: v })}
                                />
                            )
                        } : null,
                        config.ruleSet === 'local' ? {
                            id: '8',
                            interactive: true,
                            variant: 'default',
                            content: (
                                <SwitchRow
                                    title={t('modal_jacks_reserved', 'Откладывать валеты дилеру')}
                                    icon="🃏" iconBg="bg-blue-500"
                                    checked={!!config.isJacksDealerReserved}
                                    onChange={v => onChange({ isJacksDealerReserved: v })}
                                />
                            )
                        } : null,
                        {
                            id: '9',
                            interactive: true,
                            variant: 'default',
                            content: (<SwitchRow
                                title={t('modal_private_table')}
                                icon="🔒" iconBg="bg-slate-500"
                                checked={!!config.isPrivate}
                                onChange={v => onChange({ isPrivate: v })}
                            />)
                        }
                    ].filter(Boolean) as any}
                />
            </div>
        </div >
    );
}