'use client';

import { useSheet, type SheetOptions } from './SheetContract';
import { useCapsuleAction } from './useCapsuleAction';
import type { Contract } from './shared/contract';

export type UseCapsuleSheetParams<TType extends string, TData> = [TData] extends [void]
    ? {
        icon?: React.ElementType;
        label?: string;
        contract: Contract<TType, void>;
        options?: SheetOptions;
    }
    : void extends TData
    ? {
        icon?: React.ElementType;
        label?: string;
        contract: Contract<TType, TData>;
        data?: TData;
        options?: SheetOptions;
    }
    : {
        icon?: React.ElementType;
        label?: string;
        contract: Contract<TType, TData>;
        data: TData;
        options?: SheetOptions;
    };

export function useCapsuleSheet<TType extends string, TData>(params: UseCapsuleSheetParams<TType, TData>) {
    const { open } = useSheet();

    useCapsuleAction({
        icon: params.icon,
        label: params.label,
        onAction: (morphId) => {
            open({
                contract: params.contract,
                data: (params as any).data,
                options: {
                    ...params.options,
                    sourceId: morphId
                }
            } as any);
        }
    });
}