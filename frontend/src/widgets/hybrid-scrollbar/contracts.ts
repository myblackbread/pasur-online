import { defineContract } from './shared/contract';
import type { HubNotification } from './HubNotificationBus';

// Указываем, что данные для одной ячейки этого контракта - это HubNotification
export const NotificationMorphContract = defineContract<'notifications', HubNotification>('notifications');