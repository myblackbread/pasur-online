// File: src/widgets/hybrid-scrollbar/HubNotificationOverlay.tsx
'use client';

import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { HubNotificationContext } from './HubNotificationBus';
import { MorphHost, MorphDestination } from './morph-list';
import { NotificationMorphContract } from './contracts';
import { myGetDefaultCornerRadius } from './shared/platform/MYDeviceMetrics';

export const HubNotificationOverlay: React.FC = () => {
    const ctx = React.useContext(HubNotificationContext);
    if (!ctx) return null;

    const { isOpen, closeNotifications, notifications } = ctx;

    // bottom: 0 критически важен для расчета maxY в useMorphEngine
    const [anchorConfig] = useState({ width: 56, height: 56, right: 16, bottom: 0 });
    const targetCornerRadius = myGetDefaultCornerRadius();

    return (
        <div
            inert={!isOpen ? true : undefined}
            className="absolute inset-0 z-50 transition-all duration-300 ease-out"
            style={{
                opacity: isOpen ? 1 : 0,
                visibility: isOpen ? 'visible' : 'hidden'
            }}
        >
            {/* Базовый затемняющий фон */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none" />

            {/* Безопасная зона */}
            <div className="absolute inset-0 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+16px)] pointer-events-none">
                <div className="relative w-full h-full pointer-events-none">

                    <MorphDestination
                        contract={NotificationMorphContract}
                        anchorConfig={anchorConfig}
                        renderAnchor={() => (
                            <button
                                type="button"
                                onClick={closeNotifications}
                                className="w-full h-full rounded-full bg-neutral-800 border border-white/10 text-white flex items-center justify-center shadow-xl hover:bg-neutral-700 active:scale-95 transition-all pointer-events-auto"
                            >
                                <X size={24} />
                            </button>
                        )}
                        renderItem={(notif) => (
                            <div className="w-full relative h-36">
                                {/* Визуальная карточка: ее высота СТРОГО равна текущей высоте морфинга, 
            поэтому все 4 скругленных угла ВСЕГДА находятся в видимой области */}
                                <div
                                    className="absolute inset-x-0 top-0 bg-neutral-800 border border-white/10 text-white shadow-2xl overflow-hidden pointer-events-auto flex flex-col justify-start"
                                    style={{
                                        height: 'var(--morph-current-h, 56px)',
                                        borderRadius: `calc(
                    (var(--morph-initial-h) * 0.5) * (1 - var(--morph-progress)) + 
                    ${targetCornerRadius}px * var(--morph-progress)
                )`
                                    }}
                                >
                                    {/* Ровно 56px (h-14): при высоте свернутой карточки 56px видна только эта строка */}
                                    <div className="h-14 w-full px-4 flex items-center gap-3 shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">
                                            {notif.icon ? notif.icon : <Bell size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                                            <h4 className="font-semibold text-sm truncate">{notif.title}</h4>
                                            <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                                                {notif.time}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Текст сообщения: плавно появляется по мере роста прогресса */}
                                    <div
                                        className="flex-1 min-w-0 px-4 pl-[60px] pb-3 overflow-hidden transition-opacity"
                                        style={{
                                            opacity: 'var(--morph-progress, 0)'
                                        }}
                                    >
                                        <p className="text-neutral-300 text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    />

                    <MorphHost
                        activeContractType={NotificationMorphContract.type}
                        items={notifications}
                        paddingTop={16}
                        paddingBottom={0}
                    />
                </div>
            </div>
        </div>
    );
};