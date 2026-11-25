'use client';

import React from 'react';

export interface MYHubRouteContextType {
    screenId: string;
    isActive: boolean;
}

export const MYHubRouteContext = React.createContext<MYHubRouteContextType | null>(null);