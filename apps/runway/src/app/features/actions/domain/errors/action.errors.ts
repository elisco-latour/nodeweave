/**
 * Domain error unions for fallible action commands. `kind` = branch discriminant;
 * `message` = banner string surfaced by ViewModelBase.
 */
export type ResolveActionError =
  | { readonly kind: 'ActionNotFound'; readonly id: string; readonly message: string }
  | { readonly kind: 'AlreadyClosed'; readonly id: string; readonly message: string };

export type DismissActionError =
  | { readonly kind: 'ActionNotFound'; readonly id: string; readonly message: string }
  | { readonly kind: 'AlreadyClosed'; readonly id: string; readonly message: string };
