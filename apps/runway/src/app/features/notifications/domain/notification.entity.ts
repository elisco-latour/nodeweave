import type { EventType, Actor } from '../../../domain/model';

export interface NotificationProps {
  readonly id: string;
  readonly caseRef: string;
  readonly type: EventType;
  readonly at: string; // ISO timestamp
  readonly actor: Actor;
  readonly summary: string;
}

/**
 * Notification — a domain event surfaced in the activity feed (distinct from an
 * Action, which needs a decision). Rich entity: owns the "is this newer than the
 * last time the viewer looked?" rule that drives the unread badge.
 */
export class Notification {
  constructor(private readonly props: NotificationProps) {}

  get id(): string { return this.props.id; }
  get caseRef(): string { return this.props.caseRef; }
  get type(): EventType { return this.props.type; }
  get at(): string { return this.props.at; }
  get actor(): Actor { return this.props.actor; }
  get summary(): string { return this.props.summary; }

  /** When it happened, as epoch milliseconds. */
  get occurredAtMs(): number { return new Date(this.props.at).getTime(); }

  /** Unread relative to a "last seen" marker (epoch ms). */
  isNewerThan(seenAtMs: number): boolean { return this.occurredAtMs > seenAtMs; }
}
