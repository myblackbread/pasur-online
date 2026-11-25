import type { Contract } from '../shared/contract';

export type MorphDirection = 'top' | 'bottom' | 'from-top' | 'from-bottom';

export interface MorphAnchorConfig {
    width: number;
    height: number;
    right?: number;
    left?: number;
    bottom?: number;
    top?: number;
    direction?: MorphDirection;
}

export type MorphState =
    | { type: 'collapsed' }
    | { type: 'expanding'; progress: number }
    | { type: 'expanded' };

export interface MorphItemBase {
    id: string | number;
    [key: string]: any;
}

export interface MorphDestinationParams<TData = any> {
    anchorConfig: MorphAnchorConfig;
    renderAnchor: () => React.ReactNode;
    renderItem?: (item: TData) => React.ReactNode;
    direction?: MorphDirection;
}