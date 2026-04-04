---
name: schema-driven-forms
description: "Schema-driven dynamic form generation with conditional visibility (showIf rules). Use when implementing or reviewing config-drawer, RuleEvaluator, SchemaRegistry schemas, form field rendering, or conditional field logic. Covers: JSON schema format with 6 field types (string, number, select, textarea, boolean, list), recursive $and/$or RuleEvaluator, data retention when fields are hidden, DocumentFragment-based rendering, node-config-updated events."
---

# Schema-Driven Forms

The configuration engine generates forms dynamically from JSON schemas stored in `SchemaRegistry`.

## Schema Format
```js
{
  fields: {
    url: {
      type: 'string',
      label: 'Request URL',
      default: 'https://',
      placeholder: 'https://api.example.com/data'
    },
    method: {
      type: 'select',
      label: 'HTTP Method',
      options: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET'
    },
    body: {
      type: 'textarea',
      label: 'Request Body',
      rows: 6,
      showIf: { field: 'method', operator: 'in', value: ['POST', 'PUT'] }
    },
    headers: {
      type: 'list',
      label: 'Headers',
      itemSchema: {
        key: { type: 'string', label: 'Header Name' },
        value: { type: 'string', label: 'Header Value' }
      }
    },
    timeout: {
      type: 'number',
      label: 'Timeout (ms)',
      default: 5000
    },
    followRedirects: {
      type: 'boolean',
      label: 'Follow Redirects',
      default: true
    }
  }
}
```

## Field Types
| Type | HTML Element | Notes |
|------|-------------|-------|
| `string` | `<input type="text">` | With `placeholder` |
| `number` | `<input type="number">` | With optional `min`, `max`, `step` |
| `select` | `<select>` | `options` array required |
| `textarea` | `<textarea>` | Optional `rows` |
| `boolean` | `<input type="checkbox">` | Label after checkbox |
| `list` | Dynamic container | `itemSchema` defines fields per item |

## `showIf` Conditional Visibility

### Leaf Condition
```js
{ field: 'method', operator: 'equals', value: 'POST' }
```

### Operators
- `equals`, `notEquals` — strict equality
- `in`, `notIn` — array membership
- `exists`, `notExists` — checks for non-empty value

### Compound Conditions (Recursive)
```js
{
  $and: [
    { field: 'method', operator: 'in', value: ['POST', 'PUT'] },
    {
      $or: [
        { field: 'contentType', operator: 'equals', value: 'json' },
        { field: 'contentType', operator: 'equals', value: 'xml' }
      ]
    }
  ]
}
```

### `RuleEvaluator`
- `RuleEvaluator.evaluate(rule, state)` — recursive evaluation
- `$and` → every sub-rule must be true
- `$or` → at least one sub-rule must be true
- Nesting depth is unlimited

## Data Retention Rule
When a field becomes hidden via `showIf`:
- The field's value is **retained** in `_localState` (NOT deleted)
- The field's DOM element gets `hidden` attribute
- If the field becomes visible again, it shows the retained value
- The emitted `'node-config-updated'` event includes ALL values (hidden and visible)
- Consumers can decide whether to strip hidden field values

## Form Rendering Flow
1. `<config-drawer>` receives `open(nodeId, nodeType, config)`
2. Looks up schema from `SchemaRegistry.get(nodeType)`
3. Calls `renderForm(schema, config)`:
   a. Create `DocumentFragment`
   b. For each field in schema: `_createField(key, def, config[key] ?? def.default)`
   c. Store field element refs in `_fieldElements` Map
   d. Initialize `_localState` from current config + defaults
   e. Append fragment to container (single DOM operation)
   f. Evaluate all `showIf` conditions
4. On any input change:
   a. Update `_localState`
   b. Re-evaluate `showIf` conditions
   c. Dispatch `'node-config-updated'` event

## List Field Specifics
- "+ Add" button appends a new item group (fields from `itemSchema`)
- Each item has a "Remove" button
- Items stored in `_localState[fieldKey]` as an array of objects
- Adding/removing items triggers re-evaluation and event dispatch
