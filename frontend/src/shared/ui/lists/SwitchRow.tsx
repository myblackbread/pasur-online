// src/components/ui/SwitchRow.tsx
import React from 'react';
import { InfoRow } from './InfoRow';
import { RowLabel } from './RowLabel';
import { Switch } from '../buttons/Switch';

interface SwitchRowProps {
    title: string;
    subtitle?: string;
    icon?: string;
    iconBg?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export function SwitchRow({ title, subtitle, icon, iconBg, checked, onChange }: SwitchRowProps) {
    return (
        <InfoRow onClick={() => onChange(!checked)} className="px-3">
            <RowLabel title={title} subtitle={subtitle} icon={icon} iconBg={iconBg} />
            <div className="shrink-0 ml-3 flex items-center pointer-events-none">
                <Switch checked={checked} onChange={onChange} />
            </div>
        </InfoRow>
    );
}