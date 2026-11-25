import type { Contract, AnyEnvelope } from '../shared/contract';

export type NavigationTransitionType = 'scale' | 'slide';

export interface TransitionOptions {
    animated?: boolean;
}

export interface NavigationOptions extends TransitionOptions {
    title?: string;
}

export interface StackEntry {
    id: string;
    title?: string;
    pushOptions?: TransitionOptions;
    envelope: AnyEnvelope;
}

export interface NavigationState {
    depth: number;
    isRoot: boolean;
    activeEntry: StackEntry | null;
}

export type PushParams<TType extends string, TData> = [TData] extends [void]
    ? { contract: Contract<TType, void>; options?: NavigationOptions }
    : void extends TData
    ? { contract: Contract<TType, TData>; data?: TData; options?: NavigationOptions }
    : { contract: Contract<TType, TData>; data: TData; options?: NavigationOptions };

export interface NavigationActions {
    push: <TType extends string, TData>(params: PushParams<TType, TData>) => void;
    pop: (params?: { options?: TransitionOptions }) => void;
    popToRoot: (params?: { options?: TransitionOptions }) => void;
}