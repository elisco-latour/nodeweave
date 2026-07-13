/**
 * Per-pathway process configuration — the `{{config.*}}` values the workflow
 * engine resolves (owners, escalation, SLA offsets). Edited in Settings and
 * persisted; stands in for the backend's Project Config List.
 */
export interface PathwayConfig {
  requester: string;
  escalation: string;
  leads: string;
  remindAfterH: number;
  escalateAfterH: number;
}
