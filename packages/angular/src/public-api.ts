/*
 * Public API of @build744/nodeweave-angular
 */
export { VisualCanvasService } from './lib/visual-canvas.service';
export { VisualCanvasComponent } from './lib/visual-canvas.component';
export type { BackgroundVariant } from './lib/visual-canvas.component';
export { NodeweavePanelComponent } from './lib/panel.component';
export type { PanelPosition } from './lib/panel.component';

// Re-export the core building blocks so Angular consumers don't need a
// separate import of the underlying library for the common types.
export { CanvasState, Node, Port, Edge } from '@build744/nodeweave-core/core';
export type { EdgeType, MarkerType, Viewport, Point } from '@build744/nodeweave-core/core';
export type { SchemaField, SchemaDefinition } from '@build744/nodeweave-core/registries';
