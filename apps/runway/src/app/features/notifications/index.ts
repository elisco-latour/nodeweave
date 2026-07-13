/**
 * Public API of the notifications feature slice. Cross-feature/app code imports
 * only from here — never from the slice internals (ports, use cases,
 * infrastructure).
 */
export { Notification } from './domain/notification.entity';
export { NotificationsViewModel } from './state/notifications.view-model';
export { NotificationsComponent } from './ui/notifications.component';
export { provideNotificationsFeature } from './notifications.providers';
