/**
 * Domain error union for the fallible Create Case command. `kind` = branch
 * discriminant; `message` = banner string surfaced by ViewModelBase.
 *
 * Creating a case fails as a *business* outcome when the structured intake is
 * incomplete — the validation gate the wizard enforces client-side, restated
 * at the repository boundary so the contract holds for every caller.
 */
export type CreateCaseError =
  | { readonly kind: 'InvalidIntake'; readonly reason: string; readonly message: string };
