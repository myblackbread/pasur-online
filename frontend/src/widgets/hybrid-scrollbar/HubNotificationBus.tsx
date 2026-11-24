'use client';

import React from 'react';
import { useHybridHistory } from './HybridHistoryManager';

export type MYMorphState =
  | { type: 'collapsed' }
  | { type: 'expanding'; progress: number }
  | { type: 'expanded' };

export interface HubNotification {
  id: string;
  title: string;
  message: string;
  targetHubId: string;
  icon?: React.ReactNode;
  time: string;
  [key: string]: any;
}

interface HubNotificationContextType {
  isOpen: boolean;
  notifications: HubNotification[];
  openNotifications: () => void;
  closeNotifications: () => void;
  setNotifications: (notifications: HubNotification[]) => void;
  renderCard?: (notification: HubNotification, morphState: MYMorphState, cornerRadius: number) => React.ReactNode;
}

export const HubNotificationContext = React.createContext<HubNotificationContextType | null>(null);

export const HubNotificationProvider: React.FC<{ 
  children: React.ReactNode;
  notifications?: HubNotification[];
  renderCard?: (notification: HubNotification, morphState: MYMorphState, cornerRadius: number) => React.ReactNode;
}> = ({ children, notifications: externalNotifications, renderCard }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<HubNotification[]>(
    externalNotifications ?? []
  );

  React.useEffect(() => {
    if (externalNotifications !== undefined) {
      setNotifications(externalNotifications);
    }
  }, [externalNotifications]);

  const openNotifications = React.useCallback(() => setIsOpen(true), []);
  const closeNotifications = React.useCallback(() => setIsOpen(false), []);

  useHybridHistory(isOpen, closeNotifications);

  const value = React.useMemo(() => ({
    isOpen,
    notifications,
    openNotifications,
    closeNotifications,
    setNotifications,
    renderCard
  }), [isOpen, notifications, openNotifications, closeNotifications, renderCard]);

  return (
    <HubNotificationContext.Provider value={value}>
      {children}
    </HubNotificationContext.Provider>
  );
};