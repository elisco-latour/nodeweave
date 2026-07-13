import { Notification } from '../../domain/notification.entity';
import type { DomainEvent } from '../../../../domain/model';

/** DTO (the runtime's DomainEvent) → Domain (Notification). */
export const NotificationMapper = {
  toDomain(e: DomainEvent): Notification {
    return new Notification({
      id: e.id,
      caseRef: e.caseRef,
      type: e.type,
      at: e.at,
      actor: e.actor,
      summary: e.summary,
    });
  },
};
