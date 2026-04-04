---
name: vanilla-js-conventions
description: "Zero-dependency vanilla JS coding conventions for ES modules with no build step. Use when writing or reviewing any .js file in lib/ or app/. Covers: import paths with .js extensions, class syntax, #privateField, naming conventions (kebab-case files, PascalCase classes), error handling boundaries, library/app boundary rules, EventTarget over pub/sub, Command pattern, DocumentFragment batching."
---

# Vanilla JS Conventions

This project uses **zero dependencies, no build step, pure ES modules**.

## Module System
- All files use `export` / `import` — no CommonJS, no bundler
- Every file is directly loadable by the browser via `<script type="module">`
- `package.json` has `"type": "module"`
- Import paths MUST include the `.js` extension: `import { Foo } from './foo.js'`

## Code Style
- Use `class` syntax for domain objects and components
- Use `#privateField` syntax for truly private state
- Prefer `const` over `let`; never use `var`
- Use arrow functions for callbacks, regular functions for methods
- Use template literals for multi-line strings and string interpolation
- Destructure parameters and imports where it improves readability
- Name files in `kebab-case.js`
- Name classes in `PascalCase`, functions/variables in `camelCase`
- Name constants in `UPPER_SNAKE_CASE` only for true compile-time constants

## Error Handling
- Throw `Error` (or subclass) with descriptive messages at system boundaries
- Do NOT add defensive checks for impossible states inside trusted internal code
- Validate user-facing inputs (method arguments from consumers of the library API)

## No Build Step Rules
- No TypeScript — use JSDoc `@param` / `@returns` for type hints if needed
- No JSX, no template compilers, no CSS preprocessors
- No `process.env` — this runs in browsers
- No polyfills — target modern evergreen browsers (Chrome/Edge/Firefox/Safari latest 2 versions)

## Library Boundary
- `/lib/` MUST NOT import anything from `/app/`
- `/app/` imports from `/lib/index.js` — the single public entry point
- `lib/index.js` re-exports the public API; internal modules are not directly importable by consumers

## Patterns
- Prefer composition over inheritance
- Use `EventTarget` for observable state (not custom pub/sub)
- Use the Command pattern for undoable operations
- Use `DocumentFragment` for batching DOM insertions
- Use `requestAnimationFrame` for visual updates, never `setTimeout` for animation
