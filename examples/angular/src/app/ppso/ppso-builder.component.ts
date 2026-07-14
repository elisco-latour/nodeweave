import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ElementRef,
  afterNextRender,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { VisualCanvasComponent, NodeweavePanelComponent } from '@build744/nodeweave-angular';
import { NwPaletteComponent, NwInspectorComponent, nodeFromDrop, allowNodeDrop } from '@build744/nodeweave-angular-authoring';
import { processCatalog, buildOnboardingTemplate } from './process-catalog';
import { compileToWorkflow, toYaml } from './workflow-compiler';
import { runSimulation, clearRunStates, type Scenario } from './simulator';
import { CopilotPanelComponent } from './copilot-panel.component';
import {
  RuleBasedPlanner,
  applyProposal,
  revertProposal,
  commitProposal,
  type AppliedProposal,
  type ChatMessage,
  type CopilotContext,
} from './copilot';

@Component({
  selector: 'app-ppso-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [VisualCanvasComponent, NodeweavePanelComponent, NwPaletteComponent, NwInspectorComponent, CopilotPanelComponent],
  template: `
    <div class="ppso">
      <nw-palette [catalog]="catalog" heading="Process steps" (add)="onPaletteAdd($event)"></nw-palette>

      <div class="stage">
        <header class="topbar">
          <div class="crumbs">
            <span class="crumb">PPSO · Project onboarding</span>
            <span class="tmpl">Shared template — per-project values resolve from the Config List (<code>{{ '{{config.*}}' }}</code>)</span>
          </div>
          <span class="spacer"></span>
          <span class="count">{{ cv.service.nodes().length }} steps</span>
          <span class="count">{{ cv.service.edges().length }} links</span>
          <button type="button" (click)="cv.service.undo()" [disabled]="!cv.service.canUndo()">Undo</button>
          <button type="button" (click)="cv.service.redo()" [disabled]="!cv.service.canRedo()">Redo</button>
          <button type="button" (click)="reset()">Reset</button>
          <select class="scenario" [value]="scenario()" (change)="scenario.set($any($event.target).value)"
                  [disabled]="running()" title="EID outcome to simulate">
            <option value="valid">EID valid</option>
            <option value="missing">EID missing</option>
            <option value="invalid">EID invalid</option>
          </select>
          <button type="button" class="run" (click)="running() ? stopRun() : run()">{{ running() ? '■ Stop' : '▶ Run' }}</button>
          <button type="button" [class.active]="copilotOpen()" (click)="toggleCopilot()">Copilot</button>
          <button type="button" class="primary" (click)="compile()">Compile YAML</button>
        </header>

        <div #wrap class="canvas-wrap">
          <nodeweave
            #cv
            background="dots"
            [backgroundGap]="22"
            [nodeTypes]="nodeTypes"
            [nodesResizable]="false"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event)"
          >
            @if (inspector(); as ins) {
              <nodeweave-panel [x]="ins.x" [y]="ins.y">
                <nw-inspector [node]="ins.node" [schema]="ins.schema" [service]="cv.service"></nw-inspector>
              </nodeweave-panel>
            }
          </nodeweave>

          @if (yaml(); as y) {
            <aside class="yaml">
              <header>
                <strong>workflow.yaml</strong>
                <span class="grow"></span>
                <button type="button" (click)="copy()">{{ copied() ? 'Copied' : 'Copy' }}</button>
                <button type="button" class="x" (click)="yaml.set(null)" aria-label="Close">&times;</button>
              </header>
              <pre>{{ y }}</pre>
            </aside>
          }

          @if (copilotOpen()) {
            <aside class="copilot-dock">
              <app-copilot-panel
                [messages]="messages()"
                [pending]="pending()"
                (send)="onCopilotSend($event)"
                (approve)="approveProposal()"
                (reject)="rejectProposal()"
                (close)="copilotOpen.set(false)"
              ></app-copilot-panel>
            </aside>
          }

          @if (runLog().length) {
            <aside class="runlog">
              <header>
                <span class="live" [class.on]="running()"></span>
                <strong>Dry-run</strong>
                <span class="grow"></span>
                <button type="button" class="x" (click)="clearRun()" aria-label="Clear run">&times;</button>
              </header>
              <div class="lines">
                @for (line of runLog(); track $index) { <div class="line">{{ line }}</div> }
              </div>
            </aside>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }

    .ppso { display: grid; grid-template-columns: auto 1fr; height: 100%; background: #f1f4f8; }
    .ppso .stage { display: grid; grid-template-rows: auto 1fr; min-width: 0; }
    
    .ppso nw-palette {
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    .ppso .topbar {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 16px; background: #fff; border-bottom: 1px solid #e5e7eb;
      font-family: system-ui, -apple-system, sans-serif; color: #0f172a; font-size: 0.86rem;
    }
    .ppso .crumbs { display: flex; flex-direction: column; gap: 1px; }
    .ppso .crumb { font-weight: 700; }
    .ppso .tmpl { font-size: 0.68rem; color: #94a3b8; }
    .ppso .tmpl code { background: #eef2ff; color: #4f46e5; padding: 0 3px; border-radius: 3px; font-size: 0.9em; }
    .ppso .spacer { flex: 1; }
    .ppso .count { font-size: 0.76rem; color: #64748b; }
    .ppso .topbar button {
      padding: 5px 12px; border: 1px solid #e5e7eb; background: #f8fafc; color: #0f172a;
      border-radius: 7px; font: inherit; font-size: 0.78rem; cursor: pointer;
    }
    .ppso .topbar button:hover:not(:disabled) { background: #eef2ff; border-color: #c7d2fe; }
    .ppso .topbar button:disabled { opacity: 0.4; cursor: default; }
    .ppso .topbar button.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; font-weight: 600; }
    .ppso .topbar button.primary:hover { background: #4338ca; }
    .ppso .topbar button.active { background: #eef2ff; border-color: #4f46e5; color: #4f46e5; font-weight: 600; }
    .ppso .topbar .scenario { padding: 5px 8px; border: 1px solid #e5e7eb; border-radius: 7px; font: inherit; font-size: 0.76rem; background: #fff; color: #0f172a; }
    .ppso .topbar button.run { background: #0f172a; border-color: #0f172a; color: #fff; font-weight: 600; }
    .ppso .topbar button.run:hover { background: #1e293b; }

    .ppso .canvas-wrap { position: relative; min-width: 0; overflow: hidden; }

    .ppso nodeweave {
      display: block; width: 100%; height: 100%;
      --nw-bg-color: #eef1f5;
      --nw-bg-pattern: #cdd5df;
      --nw-node-bg: #ffffff;
      --nw-node-border: #e5e7eb;
      --nw-node-radius: 11px;
      --nw-text-color: #0f172a;
      --nw-selection-border: #4f46e5;
      --nw-edge-color: #94a3b8;
      --nw-edge-color-phantom: #a5b4fc;
      --nw-port-color: #cbd5e1;
      --nw-port-border-color: #94a3b8;
      --nw-port-hover-color: #4f46e5;
    }
    .ppso .vc-node { box-shadow: 0 3px 12px rgba(15, 23, 42, 0.08); transition: box-shadow 0.15s; }
    .ppso .vc-node.vc-selected { box-shadow: 0 8px 22px rgba(79, 70, 229, 0.28); }
    .ppso path.vc-edge { stroke-width: 1.8; }
    /* Run-simulation edge highlights (dash animation comes from .animated). */
    .ppso path.vc-edge.run-ok { stroke: #16a34a; stroke-width: 2.5; }
    .ppso path.vc-edge.run-fail { stroke: #dc2626; stroke-width: 2.5; }

    .ppso .yaml {
      position: absolute; top: 0; right: 0; bottom: 0; width: min(460px, 60%);
      background: #0f172a; color: #e2e8f0; z-index: 70;
      display: flex; flex-direction: column;
      box-shadow: -12px 0 32px rgba(15, 23, 42, 0.25);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .ppso .yaml header {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: #111827; border-bottom: 1px solid #1f2937;
      font-family: system-ui, sans-serif; font-size: 0.82rem;
    }
    .ppso .yaml header .grow { flex: 1; }
    .ppso .yaml header button {
      padding: 4px 10px; border: 1px solid #334155; background: #1f2937; color: #e2e8f0;
      border-radius: 6px; font: inherit; font-size: 0.74rem; cursor: pointer;
    }
    .ppso .yaml header button:hover { background: #334155; }
    .ppso .yaml header button.x { border: none; background: none; font-size: 1.1rem; padding: 0 6px; }
    .ppso .yaml pre {
      margin: 0; padding: 14px 16px; overflow: auto; flex: 1;
      font-size: 0.74rem; line-height: 1.5; white-space: pre; tab-size: 2;
    }

    .ppso .copilot-dock {
      position: absolute; top: 0; right: 0; bottom: 0; width: min(360px, 55%); z-index: 70;
      box-shadow: -12px 0 32px rgba(15, 23, 42, 0.18);
    }

    .ppso .runlog {
      position: absolute; left: 0; right: 0; bottom: 0; height: 148px; z-index: 60;
      background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column;
      box-shadow: 0 -10px 28px rgba(15, 23, 42, 0.22);
    }
    .ppso .runlog header { display: flex; align-items: center; gap: 8px; padding: 7px 12px; background: #111827; border-bottom: 1px solid #1f2937; font-family: system-ui, sans-serif; font-size: 0.78rem; }
    .ppso .runlog header .grow { flex: 1; }
    .ppso .runlog header .live { width: 8px; height: 8px; border-radius: 50%; background: #475569; }
    .ppso .runlog header .live.on { background: #22c55e; animation: rl-pulse 1s ease-in-out infinite; }
    @keyframes rl-pulse { 50% { opacity: 0.35; } }
    .ppso .runlog header .x { border: none; background: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer; padding: 0 6px; }
    .ppso .runlog .lines { flex: 1; overflow-y: auto; padding: 8px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.74rem; line-height: 1.5; }
    .ppso .runlog .line { white-space: pre; }
  `,
})
export class PpsoBuilderComponent {
  readonly cvRef = viewChild(VisualCanvasComponent);
  readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');

  readonly catalog = processCatalog;
  readonly nodeTypes = processCatalog.nodeTypes();

  readonly yaml = signal<string | null>(null);
  readonly copied = signal(false);

  // ── Run simulation state ────────────────────────────────────────────────────
  readonly scenario = signal<Scenario>('valid');
  readonly running = signal(false);
  readonly runLog = signal<string[]>([]);
  #cancel = false;

  // ── Copilot state ──────────────────────────────────────────────────────────
  readonly copilotOpen = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly #applied = signal<AppliedProposal | null>(null);
  readonly pending = computed(() => this.#applied() !== null);
  readonly #planner = new RuleBasedPlanner(processCatalog);

  #addCounter = 0;

  readonly inspector = computed(() => {
    const cv = this.cvRef();
    if (!cv) return null;
    const selected = cv.service.selectedNodes();
    if (selected.length !== 1) return null;
    const node = selected[0];
    const schema = this.catalog.schemaFor(node.type);
    if (!schema) return null;
    const v = cv.service.viewport();
    return {
      node,
      schema,
      x: (node.x + node.width) * v.zoom + v.panX + 14,
      y: node.y * v.zoom + v.panY,
    };
  });

  constructor() {
    afterNextRender(() => {
      const cv = this.cvRef();
      if (cv) buildOnboardingTemplate(cv.service);
    });
  }

  reset(): void {
    const cv = this.cvRef();
    this.#cancel = true;
    this.running.set(false);
    this.runLog.set([]);
    if (cv) buildOnboardingTemplate(cv.service);
    this.yaml.set(null);
    this.#applied.set(null);
    this.messages.set([]);
  }

  // ── Run simulation ──────────────────────────────────────────────────────────
  async run(): Promise<void> {
    const cv = this.cvRef();
    if (!cv || this.running()) return;
    this.copilotOpen.set(false);
    this.yaml.set(null);
    this.#cancel = false;
    this.running.set(true);
    this.runLog.set([]);
    try {
      await runSimulation(cv.service, {
        scenario: this.scenario(),
        onLog: (line) => this.runLog.update((l) => [...l, line]),
        isCancelled: () => this.#cancel,
      });
    } finally {
      this.running.set(false);
    }
  }

  stopRun(): void {
    this.#cancel = true;
  }

  clearRun(): void {
    const cv = this.cvRef();
    if (cv) clearRunStates(cv.service);
    this.runLog.set([]);
  }

  compile(): void {
    const cv = this.cvRef();
    if (!cv) return;
    this.copilotOpen.set(false);
    this.yaml.set(toYaml(compileToWorkflow(cv.service)));
    this.copied.set(false);
  }

  toggleCopilot(): void {
    const open = !this.copilotOpen();
    if (open) this.yaml.set(null);
    this.copilotOpen.set(open);
  }

  onCopilotSend(text: string): void {
    const cv = this.cvRef();
    if (!cv || this.pending()) return;
    this.messages.update((m) => [...m, { role: 'user', text }]);

    const ctx: CopilotContext = {
      nodes: cv.service.nodes().map((n) => ({
        id: n.id,
        type: n.type,
        title: (n.metadata.config?.['title'] as string) || n.type,
      })),
    };
    const reply = this.#planner.plan(text, ctx);

    if (reply.ops.length) {
      this.#applied.set(applyProposal(cv.service, this.catalog, reply.ops));
      this.messages.update((m) => [...m, { role: 'assistant', text: reply.text, ops: reply.ops, status: 'pending' }]);
    } else {
      this.messages.update((m) => [...m, { role: 'assistant', text: reply.text }]);
    }
  }

  approveProposal(): void {
    const cv = this.cvRef();
    const applied = this.#applied();
    if (cv && applied) commitProposal(cv.service, applied);
    this.#resolvePending('approved');
  }

  rejectProposal(): void {
    const cv = this.cvRef();
    const applied = this.#applied();
    if (cv && applied) revertProposal(cv.service, applied);
    this.#resolvePending('rejected');
  }

  #resolvePending(status: 'approved' | 'rejected'): void {
    this.#applied.set(null);
    this.messages.update((m) => m.map((msg) => (msg.status === 'pending' ? { ...msg, status } : msg)));
  }

  copy(): void {
    const text = this.yaml();
    if (text) {
      navigator.clipboard?.writeText(text);
      this.copied.set(true);
    }
  }

  onDragOver(ev: DragEvent): void {
    allowNodeDrop(ev);
  }

  onDrop(ev: DragEvent): void {
    const cv = this.cvRef();
    if (cv) nodeFromDrop(this.catalog, cv.service, ev);
  }

  onPaletteAdd(type: string): void {
    const cv = this.cvRef();
    if (!cv) return;
    const def = this.catalog.get(type);
    const rect = this.wrap()?.nativeElement.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 480;
    const cy = rect ? rect.top + rect.height / 2 : 320;
    const p = cv.service.screenToFlowPosition({ x: cx, y: cy });
    const jitter = (this.#addCounter++ % 5) * 26;
    const node = this.catalog.createNode(
      type,
      p.x - (def?.width ?? 220) / 2 + jitter,
      p.y - (def?.height ?? 88) / 2 + jitter,
    );
    cv.service.addNode(node);
    cv.service.selectNode(node.id);
  }
}
