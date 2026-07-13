/**
 * Domain error union for the fallible Publish Process command. `kind` = branch
 * discriminant; `message` = banner string surfaced by ViewModelBase.
 *
 * Publishing fails as a *business* outcome when the process has no steps — an
 * empty definition would light nothing on the Operate map.
 */
export type PublishProcessError =
  | { readonly kind: 'EmptyProcess'; readonly message: string };
