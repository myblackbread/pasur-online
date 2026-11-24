// src/components/ui/SwitchRow.tsx
import React from 'react';
import { InfoRow } from './InfoRow';
import { RowLabel } from './RowLabel';
import { Switch } from '../buttons/Switch';
import { motion } from 'framer-motion';

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
        <div onClick={() => onChange(!checked)} className='flex items-center justify-between w-full'>
            <RowLabel title={title} subtitle={subtitle} icon={icon} iconBg={iconBg} />
            <div className="shrink-0 ml-3 flex items-center pointer-events-none">
                <Switch checked={checked} onChange={onChange} />
            </div>
        </div>
    );
}