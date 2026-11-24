import type { Contract } from '../shared/contract';

export interface MorphAnchorConfig {
  width: number;
  height: number;
  right: number;
  bottom: number;
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
}