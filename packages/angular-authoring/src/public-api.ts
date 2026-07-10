/*
 * Public API of @nodeweave/angular-authoring
 *
 * A catalog-driven authoring layer on top of @nodeweave/angular: describe your
 * node types once (label, icon, ports, config schema, renderer) and get a
 * palette, a schema inspector, and drag-to-create for free.
 */
export { NodeCatalog } from './lib/node-catalog';
export type { NodeTypeDefinition, PortDir, CatalogGroup } from './lib/node-catalog';
export { NwPaletteComponent } from './lib/palette.component';
export { NwInspectorComponent } from './lib/inspector.component';
export { NW_DND_TYPE, nodeFromDrop, allowNodeDrop } from './lib/dnd';
