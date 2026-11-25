import type { AnyEnvelope, Contract } from '../shared/contract';
import type { MYPresentationDetent } from '../my/MYPresentationDetent';

export interface SheetOptions {
    sourceId?: string;
    detents?: MYPresentationDetent[];
    onDismiss?: () => void;
}

export interface SheetEntry extends SheetOptions {
    id: string;
    envelope: AnyEnvelope;
}

export type OpenSheetParams<TType extends string, TData> = [TData] extends [void]
    ? { contract: Contract<TType, void>; options?: SheetOptions }
    : void extends TData
    ? { contract: Contract<TType, TData>; data?: TData; options?: SheetOptions }
    : { contract: Contract<TType, TData>; data: TData; options?: SheetOptions };