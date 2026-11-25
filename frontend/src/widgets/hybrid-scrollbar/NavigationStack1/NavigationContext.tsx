import { createContext, useContext } from 'react';
import type { NavigationActions, NavigationState, TransitionOptions } from './types';

export const NOOP_ACTIONS: NavigationActions = Object.freeze({
    push: () => { },
    pop: () => { },
    popToRoot: () => { },
});

export const DEFAULT_STATE: NavigationState = Object.freeze({
    depth: 0,
    isRoot: true,
    activeEntry: null,
});

export const NavigationActionsContext = createContext<NavigationActions>(NOOP_ACTIONS);
export const NavigationStateContext = createContext<NavigationState>(DEFAULT_STATE);

export const PopOptionsContext = createContext<{ current: TransitionOptions | undefined }>({ current: undefined });

export function useNavigation(): NavigationActions {
    const context = useContext(NavigationActionsContext);
    if (context === NOOP_ACTIONS && process.env.NODE_ENV !== 'production') {
        console.warn('NavigationStack: useNavigation called outside of NavigationStack.');
    }
    return context;
}

export function useNavigationState(): NavigationState {
    const context = useContext(NavigationStateContext);
    if (context === DEFAULT_STATE && process.env.NODE_ENV !== 'production') {
        console.warn('NavigationStack: useNavigationState called outside of NavigationStack.');
    }
    return context;
}