export interface UserProps {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  /** Organizational unit, e.g. "PPSO Operations". */
  readonly org: string;
  readonly roles: readonly string[];
}

/**
 * The authenticated user. In the BFF model the SPA never sees tokens — this is
 * the shape the BFF's `/user` endpoint returns for the current session.
 */
export class User {
  constructor(private readonly props: UserProps) {}

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get email(): string { return this.props.email; }
  get org(): string { return this.props.org; }
  get roles(): readonly string[] { return this.props.roles; }

  /** Up-to-two-letter monogram for the avatar (e.g. "N. Rughoo" → "NR"). */
  get initials(): string {
    const parts = this.props.name.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p.replace(/[^A-Za-z]/g, '')[0] ?? '');
    return (letters.join('') || this.props.name.slice(0, 2)).toUpperCase();
  }

  hasRole(role: string): boolean {
    return this.props.roles.includes(role);
  }
}
