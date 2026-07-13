import type { Pathway } from '../../../domain/model';

export interface ProcessProps {
  readonly pathway: Pathway;
  readonly version: number;
  /** The authored graph (nodeweave CanvasState JSON) — opaque to the domain. */
  readonly graph: unknown;
  readonly publishedAt: string;
}

/**
 * Process — a published, versioned onboarding process definition. The stable
 * Compose→Operate contract: Compose publishes one, the case process map renders
 * it. A `Process` instance exists only when a version has been published.
 */
export class Process {
  constructor(private readonly props: ProcessProps) {}

  get pathway(): Pathway { return this.props.pathway; }
  get version(): number { return this.props.version; }
  get graph(): unknown { return this.props.graph; }
  get publishedAt(): string { return this.props.publishedAt; }
}
