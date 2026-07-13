import { DomainError } from '../../../shared/kernel/domain-error';
import type { ActionKind } from '../../../domain/model';

export type ActionStatus = 'open' | 'resolved' | 'dismissed';

export interface ActionProps {
  readonly id: string;
  readonly caseRef: string;
  readonly kind: ActionKind;
  readonly title: string;
  readonly reason: string;
  readonly impactedItems: readonly string[];
  readonly recommendation?: string;
  readonly evidence?: string;
  readonly createdAt: string;
  readonly status: ActionStatus;
  /** Denormalised from the case so the Inbox needn't reach into the cases feature. */
  readonly joinerName: string;
}

/**
 * Action — a thing that needs a person (the Action Inbox item). Rich entity:
 * exposes status predicates and guards its own transitions.
 */
export class Action {
  constructor(private readonly props: ActionProps) {}

  get id(): string { return this.props.id; }
  get caseRef(): string { return this.props.caseRef; }
  get kind(): ActionKind { return this.props.kind; }
  get title(): string { return this.props.title; }
  get reason(): string { return this.props.reason; }
  get impactedItems(): readonly string[] { return this.props.impactedItems; }
  get recommendation(): string | undefined { return this.props.recommendation; }
  get evidence(): string | undefined { return this.props.evidence; }
  get createdAt(): string { return this.props.createdAt; }
  get status(): ActionStatus { return this.props.status; }
  get joinerName(): string { return this.props.joinerName; }

  get isOpen(): boolean { return this.props.status === 'open'; }
  get isResolved(): boolean { return this.props.status === 'resolved'; }
  get isDismissed(): boolean { return this.props.status === 'dismissed'; }

  /** Only an open action can be resolved or dismissed. */
  get isActionable(): boolean { return this.isOpen; }

  /** Guard for imperative call sites; throws on an already-closed action. */
  ensureActionable(): void {
    if (!this.isActionable) {
      throw new DomainError(`Action ${this.id} is already ${this.status} and cannot be acted on.`);
    }
  }
}
