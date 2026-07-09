/*
 * Public API of @visual-canvas/angular
 */
export { VisualCanvasService } from './lib/visual-canvas.service';
export { VisualCanvasComponent } from './lib/visual-canvas.component';
export type { BackgroundVariant } from './lib/visual-canvas.component';

// Re-export the core building blocks so Angular consumers don't need a
// separate import of the underlying library for the common types.
export { CanvasState, Node, Port, Edge } from 'visual-canvas/core';
