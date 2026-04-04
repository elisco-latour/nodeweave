export { CommandHistory } from './core/command-history.js';
export { Node, Port, Edge } from './core/graph.js';
export { CanvasState } from './core/canvas-state.js';
export { PipelineBuilder } from './core/pipeline-builder.js';
export { VisualRegistry } from './registries/visual-registry.js';
export { TopologyRegistry } from './registries/topology-registry.js';
export { SchemaRegistry } from './registries/schema-registry.js';
export { registerStarterNodes } from './registries/starter-nodes.js';

// Web Components (side-effect imports to register custom elements)
import './components/canvas-workspace.js';
import './components/canvas-node.js';
import './components/canvas-port.js';
import './components/canvas-edge-layer.js';
