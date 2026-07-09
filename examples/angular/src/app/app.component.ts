import { Component, ChangeDetectionStrategy, Type } from '@angular/core';
import { VisualCanvasComponent, Node, Port } from '@visual-canvas/angular';
import { FancyNodeComponent } from './fancy-node.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [VisualCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="toolbar">
      <strong>visual-canvas &times; Angular</strong>
      <button type="button" (click)="addNode(cv, 'task')">Add node</button>
      <button type="button" (click)="addNode(cv, 'fancy')">Add fancy node</button>
      <button type="button" (click)="cv.service.undo()" [disabled]="!cv.service.canUndo()">Undo</button>
      <button type="button" (click)="cv.service.redo()" [disabled]="!cv.service.canRedo()">Redo</button>
      <button type="button" (click)="cv.service.clear()">Clear</button>
      <span class="stat">{{ cv.service.nodes().length }} nodes</span>
      <span class="stat">{{ cv.service.edges().length }} edges</span>
      <span class="stat">{{ cv.service.selectedIds().size }} selected</span>
    </header>
    <visual-canvas
      #cv
      background="dots"
      [backgroundGap]="24"
      [snapToGrid]="true"
      [nodeTypes]="nodeTypes"
      (connect)="onConnect($event)"
    ></visual-canvas>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100vh;
      background: #0b1220;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      background: #16213e;
      color: #e2e8f0;
      border-bottom: 1px solid #2a3a5e;
    }
    .toolbar button {
      padding: 4px 10px;
      background: #1f2f52;
      color: #e2e8f0;
      border: 1px solid #2a3a5e;
      border-radius: 5px;
      cursor: pointer;
    }
    .toolbar button:disabled { opacity: 0.4; cursor: default; }
    .stat { font-size: 0.85rem; opacity: 0.8; margin-left: 4px; }
    visual-canvas { display: block; }
  `,
})
export class AppComponent {
  #counter = 0;

  readonly nodeTypes: Record<string, Type<unknown>> = {
    fancy: FancyNodeComponent,
  };

  addNode(cv: VisualCanvasComponent, type: string): void {
    const id = `n${++this.#counter}`;
    const node = new Node({
      id,
      type,
      x: 80 + (this.#counter % 5) * 60,
      y: 80 + (this.#counter % 5) * 50,
    });
    node.addPort(new Port({ id: `${id}:in`, direction: 'in', nodeId: id }));
    node.addPort(new Port({ id: `${id}:out`, direction: 'out', nodeId: id }));
    cv.service.addNode(node);
  }

  onConnect(e: { source: string; target: string }): void {
    console.log('[example] connected', e.source, '->', e.target);
  }
}
