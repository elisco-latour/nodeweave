// Re-export everything from split entry points for backwards compatibility.
// Consumers can import from lib/index.js (all-in-one) or from the
// individual entry points: lib/core.js, lib/controllers.js,
// lib/registries.js, lib/components.js.

export * from './core.js';
export * from './controllers.js';
export * from './registries.js';

// Web Components (side-effect imports to register custom elements)
import './components.js';
