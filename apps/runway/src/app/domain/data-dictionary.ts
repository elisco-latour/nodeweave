/**
 * Governance posture, made concrete: the classification + ownership of every
 * field on the canonical readiness record. "Classify before processing" (BRD
 * §4) — this table is the contract that access control, masking, retention,
 * and audit rules key off. It is intentionally code (not prose) so the app can
 * enforce it — e.g. mask `personal` fields for viewers who aren't authorized.
 */

export type Classification = 'public' | 'internal' | 'confidential' | 'personal';

/** Does the product own this data, or does it reference an authoritative system? */
export type Ownership = 'owned' | 'referenced';

export interface FieldSpec {
  field: string;
  classification: Classification;
  ownership: Ownership;
  note?: string;
}

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  personal: 'Personal (PII)',
};

/** One row per readiness-record field. The minimum necessary — nothing more. */
export const READINESS_FIELD_DICTIONARY: FieldSpec[] = [
  { field: 'caseRef', classification: 'internal', ownership: 'owned', note: 'Internal case identifier' },
  { field: 'requestType', classification: 'internal', ownership: 'owned' },
  { field: 'pathway', classification: 'internal', ownership: 'owned' },
  { field: 'processVersion', classification: 'internal', ownership: 'owned' },
  { field: 'joinerRef', classification: 'internal', ownership: 'referenced', note: 'Non-sensitive link to the person in HR/IAM' },
  { field: 'joinerName', classification: 'personal', ownership: 'referenced', note: 'PII — masked unless authorized; source of truth is HR' },
  { field: 'role', classification: 'internal', ownership: 'referenced' },
  { field: 'location', classification: 'internal', ownership: 'referenced' },
  { field: 'intakeSource', classification: 'internal', ownership: 'owned' },
  { field: 'schemaVersion', classification: 'internal', ownership: 'owned' },
  { field: 'startDate', classification: 'confidential', ownership: 'referenced', note: 'From the approved intake / HR feed' },
  { field: 'readinessDeadline', classification: 'internal', ownership: 'owned' },
  { field: 'state', classification: 'internal', ownership: 'owned' },
  { field: 'items', classification: 'confidential', ownership: 'owned', note: 'Readiness orchestration state; task details are references' },
  { field: 'blockers', classification: 'internal', ownership: 'owned' },
  { field: 'owners', classification: 'internal', ownership: 'referenced', note: 'Identities referenced from the directory' },
];

const byField = new Map(READINESS_FIELD_DICTIONARY.map((f) => [f.field, f]));
export function classify(field: string): FieldSpec | undefined {
  return byField.get(field);
}

/** Mask a personal value for display when the viewer isn't authorized to see PII. */
export function maskPersonal(value: string, authorized: boolean): string {
  if (authorized || !value) return value;
  const parts = value.split(/\s+/);
  return parts.map((p) => (p ? p[0] + '•'.repeat(Math.max(1, p.length - 1)) : p)).join(' ');
}
