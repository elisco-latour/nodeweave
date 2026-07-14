import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Node } from '@build744/angular';

/**
 * A custom Angular node component. Receives the node via a `node` input and
 * is rendered by <nodeweave> for every node whose type maps to it.
 */
@Component({
  selector: 'app-fancy-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fancy">
      <div class="title">&#10022; {{ node().id }}</div>
      <div class="sub">custom Angular node</div>
    </div>
  `,
  styles: `
    .fancy {
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 8px 12px;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      color: #fff;
      border-radius: inherit;
    }
    .title { font-weight: 600; }
    .sub { font-size: 0.7rem; opacity: 0.85; }
  `,
})
export class FancyNodeComponent {
  readonly node = input.required<Node>();
}
