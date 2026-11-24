import React from 'react';
import { InfoRow } from './InfoRow';
import { RowLabel } from './RowLabel';
import { ChevronRight } from 'lucide-react';

interface ActionRowProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    iconBg?: string;
    rightContent?: React.ReactNode;
    onClick?: () => void;
    className?: string;
    showArrow?: boolean;
}

export function ActionRow({ title, subtitle, icon, iconBg, rightContent, onClick, className = '', showArrow = true }: ActionRowProps) {
    return (
        <div onClick={onClick} className='flex items-center justify-between w-full'>
            <RowLabel icon={icon} iconBg={iconBg} title={title} subtitle={subtitle} />
            {(rightContent || (showArrow && onClick)) && (
                <div className="shrink-0 ml-3 flex items-center pointer-events-none gap-2">
                    {rightContent}
                    {showArrow && onClick && <ChevronRight className="w-5 h-5 text-theme-text opacity-30 shrink-0" />}
                </div>
            )}
        </div>
    );
}