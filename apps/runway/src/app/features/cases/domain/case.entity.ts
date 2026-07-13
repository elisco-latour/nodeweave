import type {
  ReadinessRecord, ReadinessItem, Blocker, Owners, ReadinessState,
  Pathway, RequestType,
} from '../../../domain/model';
import { READINESS_STATE_LABEL, confidenceOf } from '../../../domain/model';

/**
 * Case — the canonical onboarding *readiness record* as a rich domain entity.
 *
 * Wraps the raw `ReadinessRecord` and owns the small pieces of readiness policy
 * that were previously scattered across components and the RuntimeService:
 * completion confidence and the "overdue" rule. It exposes the underlying
 * record via `record` for interop with presentational widgets (process map,
 * CSV export) that still speak the raw shape during the migration.
 */
export class Case {
  constructor(private readonly props: ReadinessRecord) {}

  get caseRef(): string { return this.props.caseRef; }
  get requestType(): RequestType { return this.props.requestType; }
  get pathway(): Pathway { return this.props.pathway; }
  get processVersion(): string { return this.props.processVersion; }
  get joinerRef(): string { return this.props.joinerRef; }
  get joinerName(): string { return this.props.joinerName; }
  get role(): string { return this.props.role; }
  get location(): string { return this.props.location; }
  get intakeSource(): string { return this.props.intakeSource; }
  get schemaVersion(): string { return this.props.schemaVersion; }
  get startDate(): string { return this.props.startDate; }
  get readinessDeadline(): string { return this.props.readinessDeadline; }
  get state(): ReadinessState { return this.props.state; }
  get items(): readonly ReadinessItem[] { return this.props.items; }
  get blockers(): readonly Blocker[] { return this.props.blockers; }
  get owners(): Owners { return this.props.owners; }
  get createdAt(): string { return this.props.createdAt; }
  get updatedAt(): string { return this.props.updatedAt; }

  /** Human-readable state label. */
  get stateLabel(): string { return READINESS_STATE_LABEL[this.props.state]; }

  /** Completion confidence in [0,1] — done / total non-skipped items. */
  get confidence(): number { return confidenceOf(this.props); }

  /** Completion confidence as a whole percentage. */
  get confidencePct(): number { return Math.round(this.confidence * 100); }

  get isCompleted(): boolean { return this.props.state === 'completed'; }
  get isCancelled(): boolean { return this.props.state === 'cancelled'; }
  get isReadyForDay1(): boolean { return this.props.state === 'ready-for-day-1'; }

  /**
   * Overdue when the readiness deadline has passed and the case is neither
   * completed nor ready for Day 1. `asOf` is an ISO date (yyyy-mm-dd) so the
   * rule is testable and the caller controls "today".
   */
  isOverdue(asOf: string): boolean {
    return this.props.readinessDeadline < asOf && !this.isCompleted && !this.isReadyForDay1;
  }

  /** The underlying record — for widgets/exports that still speak the raw shape. */
  get record(): ReadinessRecord { return this.props; }
}
