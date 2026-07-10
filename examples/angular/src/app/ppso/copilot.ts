import { Edge, type VisualCanvasService } from '@nodeweave/angular';
import { NodeCatalog } from '@nodeweave/angular-authoring';

// ── Proposed operations (what a "spec edit" is, structurally) ────────────────
export interface AddNodeOp { kind: 'addNode'; type: string; title?: string; ref?: string; }
export interface ConnectOp { kind: 'connect'; from: string; to: string; }
export interface UpdateOp { kind: 'updateConfig'; nodeId: string; patch: Record<string, unknown>; }
export interface RemoveOp { kind: 'removeNode'; nodeId: string; }
export type Op = AddNodeOp | ConnectOp | UpdateOp | RemoveOp;

export interface CopilotReply { text: string; ops: Op[]; }
export interface NodeRef { id: string; type: string; title: string; }
export interface CopilotContext { nodes: NodeRef[]; }

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  ops?: Op[];
  status?: 'pending' | 'approved' | 'rejected';
}

/**
 * A planner turns a natural-language request + the current graph into a set of
 * structured operations. Swap {@link RuleBasedPlanner} for an LLM adapter that
 * returns the same shape (e.g. via structured output / tool calls).
 */
export interface CopilotPlanner {
  plan(message: string, ctx: CopilotContext): CopilotReply;
}

export const COPILOT_SUGGESTIONS = [
  'Add a mailing-lists step after Add to Teams channel',
  'Set slaMinutes of Create Planner plan to 3',
  'Remove the Org chart step',
  'Connect Validate EID to Create Planner plan',
];

const SYNONYMS: Record<string, string[]> = {
  'action.graphAddGroups': ['mailing', 'engage', 'viva', 'group', 'groups', 'distribution'],
  'action.graphAddTeams': ['teams', 'channel', 'membership'],
  'action.sendEmails': ['email', 'emails', 'access'],
  'action.sharepointWrite': ['sharepoint', 'resource'],
  'action.createPlan': ['planner', 'plan'],
  'action.teamsDM': ['dm', 'notification', 'notify', 'personalised', 'personalized'],
  'task.cdpRoro': ['cdp', 'roro', 'roll'],
  'task.myteWbs': ['myte', 'wbs', 'timesheet'],
  'task.orgChart': ['org', 'chart', 'orgchart', 'organisation', 'organization'],
  'gate.validateEID': ['validate', 'validation', 'eid'],
  'gate.allComplete': ['complete', 'completion', 'join'],
  'monitor.sla': ['monitor', 'escalate', 'escalation', 'reminder', 'sla', 'overdue'],
  'notify.confirm': ['confirm', 'confirmation'],
  'trigger.recordSubmitted': ['record', 'submit', 'submitted', 'intake'],
  'trigger.schedule': ['schedule', 'daily', 'cron', 'recurring'],
};

const tokens = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Deterministic natural-language planner. Resolves node types against the
 * catalog and node references against the current graph, then emits ops for a
 * handful of intents: add [after], connect, set field, remove.
 */
export class RuleBasedPlanner implements CopilotPlanner {
  readonly #catalog: NodeCatalog;
  readonly #index: Array<{ type: string; label: string; keywords: Set<string> }>;

  constructor(catalog: NodeCatalog) {
    this.#catalog = catalog;
    this.#index = catalog.all().map((def) => ({
      type: def.type,
      label: def.label,
      keywords: new Set([...tokens(def.label), ...tokens(def.type), ...(SYNONYMS[def.type] ?? [])]),
    }));
  }

  plan(message: string, ctx: CopilotContext): CopilotReply {
    const m = message.trim();
    if (!m) return { text: 'Tell me what to change.', ops: [] };

    // remove / delete
    let mt = m.match(/^(?:remove|delete|drop)\s+(?:the\s+)?(.+?)(?:\s+step)?$/i);
    if (mt) {
      const node = this.#resolveNode(mt[1], ctx);
      if (!node) return this.#notFound(mt[1]);
      return { text: `Remove “${node.title}” (and its links)?`, ops: [{ kind: 'removeNode', nodeId: node.id }] };
    }

    // set / change <field> of <node> to <value>
    mt = m.match(/^(?:set|change|update)\s+(?:the\s+)?(.+?)\s+(?:of|for|on)\s+(.+?)\s+to\s+(.+)$/i);
    if (mt) {
      const node = this.#resolveNode(mt[2], ctx);
      if (!node) return this.#notFound(mt[2]);
      const field = this.#resolveField(node.type, mt[1]);
      if (!field) return { text: `“${mt[1].trim()}” isn’t a field on “${node.title}”.`, ops: [] };
      const value = this.#coerce(node.type, field, mt[3].trim());
      return {
        text: `Set ${field} of “${node.title}” to ${JSON.stringify(value)}?`,
        ops: [{ kind: 'updateConfig', nodeId: node.id, patch: { [field]: value } }],
      };
    }

    // connect <a> to <b>
    mt = m.match(/^(?:connect|link|wire)\s+(.+?)\s+(?:to|into|->|→)\s+(.+)$/i);
    if (mt) {
      const a = this.#resolveNode(mt[1], ctx);
      const b = this.#resolveNode(mt[2], ctx);
      if (!a || !b) return { text: `I couldn’t resolve both steps to connect.`, ops: [] };
      return { text: `Connect “${a.title}” → “${b.title}”?`, ops: [{ kind: 'connect', from: a.id, to: b.id }] };
    }

    // add [a|an] <type> [after <ref>] [called <title>]
    mt = m.match(/^add\s+(?:a|an)?\s*(.+)$/i);
    if (mt) {
      let rest = mt[1];
      let title: string | undefined;
      const called = rest.match(/\s+(?:called|named|titled)\s+"?(.+?)"?$/i);
      if (called) { title = called[1].trim(); rest = rest.slice(0, called.index).trim(); }
      let ref: NodeRef | null = null;
      const after = rest.match(/\s+after\s+(.+)$/i);
      if (after) { ref = this.#resolveNode(after[1], ctx); rest = rest.slice(0, after.index).trim(); }
      rest = rest.replace(/\s+step$/i, '').trim();
      const def = this.#resolveType(rest);
      if (!def) return { text: `I couldn’t match “${rest}” to a step. Try: mailing lists, Teams channel, access emails, CDP RORO…`, ops: [] };
      const where = ref ? ` after “${ref.title}”` : '';
      return {
        text: `Add “${title ?? def.label}”${where}?`,
        ops: [{ kind: 'addNode', type: def.type, title, ref: ref?.id }],
      };
    }

    return {
      text: 'I can add, connect, configure, or remove steps. E.g. “add a mailing-lists step after Add to Teams channel”, “set slaMinutes of Create Planner plan to 3”, “remove the Org chart step”.',
      ops: [],
    };
  }

  #notFound(phrase: string): CopilotReply {
    return { text: `I couldn’t find a step matching “${phrase.trim()}”.`, ops: [] };
  }

  #resolveType(phrase: string): { type: string; label: string } | null {
    const toks = new Set(tokens(phrase));
    if (!toks.size) return null;
    let best: { type: string; label: string } | null = null;
    let bestScore = 0;
    for (const entry of this.#index) {
      let score = 0;
      for (const t of toks) if (entry.keywords.has(t)) score++;
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    return bestScore > 0 ? best : null;
  }

  #resolveNode(phrase: string, ctx: CopilotContext): NodeRef | null {
    const toks = tokens(phrase);
    if (!toks.length) return null;
    let best: NodeRef | null = null;
    let bestScore = 0;
    for (const n of ctx.nodes) {
      const hay = new Set([...tokens(n.title), ...tokens(n.type)]);
      let score = 0;
      for (const t of toks) if (hay.has(t)) score++;
      if (score > bestScore) { bestScore = score; best = n; }
    }
    return bestScore > 0 ? best : null;
  }

  #resolveField(type: string, phrase: string): string | null {
    const schema = this.#catalog.schemaFor(type);
    if (!schema) return null;
    const toks = tokens(phrase);
    for (const [key, def] of Object.entries(schema.fields)) {
      if (key.toLowerCase() === phrase.trim().toLowerCase()) return key;
      const hay = new Set([...tokens(key), ...tokens(def.label)]);
      if (toks.every((t) => hay.has(t))) return key;
    }
    return null;
  }

  #coerce(type: string, field: string, raw: string): unknown {
    const def = this.#catalog.schemaFor(type)?.fields[field];
    const clean = raw.replace(/^["']|["']$/g, '');
    if (def?.type === 'number') { const n = Number(clean); return Number.isNaN(n) ? clean : n; }
    if (def?.type === 'boolean') return /^(true|yes|on|1)$/i.test(clean);
    return clean;
  }
}

// ── Applying a proposal as a reversible, on-canvas preview ───────────────────
export interface AppliedProposal {
  addedNodeIds: string[];
  addedEdgeIds: string[];
  updated: Array<{ id: string; before: Record<string, unknown> }>;
  markedRemoved: string[];
}

const PROP = '__proposed';
let seq = 0;

function stripProposed(service: VisualCanvasService, id: string): void {
  const node = service.state.nodes.get(id);
  if (!node) return;
  const cfg = { ...(node.metadata.config ?? {}) } as Record<string, unknown>;
  delete cfg[PROP];
  service.state.updateNodeConfig(id, cfg);
}

/** Apply ops to the live graph, tagged as a preview (`__proposed`). */
export function applyProposal(service: VisualCanvasService, catalog: NodeCatalog, ops: Op[]): AppliedProposal {
  const applied: AppliedProposal = { addedNodeIds: [], addedEdgeIds: [], updated: [], markedRemoved: [] };

  for (const op of ops) {
    if (op.kind === 'addNode') {
      const id = `cp-n${++seq}`;
      const refNode = op.ref ? service.state.nodes.get(op.ref) : null;
      const x = refNode ? refNode.x + refNode.width + 70 : 260 + applied.addedNodeIds.length * 30;
      const y = refNode ? refNode.y : 220 + applied.addedNodeIds.length * 30;
      const overrides: Record<string, unknown> = { [PROP]: 'added' };
      if (op.title) overrides['title'] = op.title;
      service.addNode(catalog.createNode(op.type, x, y, overrides, id));
      applied.addedNodeIds.push(id);
      if (op.ref) tryConnect(service, op.ref, id, applied);
    } else if (op.kind === 'connect') {
      tryConnect(service, op.from, op.to, applied);
    } else if (op.kind === 'updateConfig') {
      const node = service.state.nodes.get(op.nodeId);
      if (!node) continue;
      applied.updated.push({ id: op.nodeId, before: { ...(node.metadata.config ?? {}) } });
      service.updateNodeConfig(op.nodeId, { ...op.patch, [PROP]: 'updated' });
    } else if (op.kind === 'removeNode') {
      service.updateNodeConfig(op.nodeId, { [PROP]: 'removed' });
      applied.markedRemoved.push(op.nodeId);
    }
  }
  return applied;
}

function tryConnect(service: VisualCanvasService, from: string, to: string, applied: AppliedProposal): void {
  const id = `cp-e${++seq}`;
  try {
    service.addEdge(new Edge({
      id, sourcePortId: `${from}:out`, targetPortId: `${to}:in`,
      type: 'smoothstep', markerEnd: 'arrowclosed', data: { className: 'cp-proposed' },
    }));
    applied.addedEdgeIds.push(id);
  } catch {
    /* invalid connection (missing port / cycle) — skip silently */
  }
}

/** Discard a preview: remove added items, restore edits, un-mark removals. */
export function revertProposal(service: VisualCanvasService, a: AppliedProposal): void {
  for (const id of a.addedEdgeIds) try { service.removeEdge(id); } catch { /* gone */ }
  for (const id of a.addedNodeIds) try { service.removeNode(id); } catch { /* gone */ }
  for (const u of a.updated) service.state.updateNodeConfig(u.id, u.before);
  for (const id of a.markedRemoved) stripProposed(service, id);
}

/** Accept a preview: clear tags and execute deferred removals. */
export function commitProposal(service: VisualCanvasService, a: AppliedProposal): void {
  for (const id of a.addedNodeIds) stripProposed(service, id);
  for (const u of a.updated) stripProposed(service, u.id);
  for (const id of a.markedRemoved) try { service.removeNode(id); } catch { /* gone */ }
}
