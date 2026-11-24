import React from 'react';
import { InfoRow } from '../lists/InfoRow';
import { SegmentedControl, SegmentOption  } from './SegmentedControl';

interface SegmentRowProps<T> {
    options: SegmentOption<T>[];
    value: T | null;
    onChange: (val: T) => void;
}

export function SegmentRow<T extends string | number>({ options, value, onChange }: SegmentRowProps<T>) {
    return (
        <InfoRow variant={'none'}> 
            <SegmentedControl options={options} value={value} onChange={onChange} />
        </InfoRow>
    );
}