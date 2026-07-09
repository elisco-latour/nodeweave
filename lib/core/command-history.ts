export interface Command {
  execute(): void;
  undo(): void;
}

export class CommandHistory {
  readonly #undoStack: Command[] = [];
  readonly #redoStack: Command[] = [];

  execute(command: Command): void {
    command.execute();
    this.#undoStack.push(command);
    this.#redoStack.length = 0;
  }

  undo(): void {
    if (this.#undoStack.length === 0) return;
    const command = this.#undoStack.pop()!;
    command.undo();
    this.#redoStack.push(command);
  }

  redo(): void {
    if (this.#redoStack.length === 0) return;
    const command = this.#redoStack.pop()!;
    command.execute();
    this.#undoStack.push(command);
  }

  get canUndo(): boolean {
    return this.#undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.#redoStack.length > 0;
  }

  clear(): void {
    this.#undoStack.length = 0;
    this.#redoStack.length = 0;
  }
}
