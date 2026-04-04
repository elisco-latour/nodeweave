/**
 * Command interface (duck-typed):
 *   execute() — perform the action
 *   undo()    — reverse the action
 */

export class CommandHistory {
  #undoStack = [];
  #redoStack = [];

  execute(command) {
    command.execute();
    this.#undoStack.push(command);
    this.#redoStack.length = 0;
  }

  undo() {
    if (this.#undoStack.length === 0) return;
    const command = this.#undoStack.pop();
    command.undo();
    this.#redoStack.push(command);
  }

  redo() {
    if (this.#redoStack.length === 0) return;
    const command = this.#redoStack.pop();
    command.execute();
    this.#undoStack.push(command);
  }

  get canUndo() {
    return this.#undoStack.length > 0;
  }

  get canRedo() {
    return this.#redoStack.length > 0;
  }

  clear() {
    this.#undoStack.length = 0;
    this.#redoStack.length = 0;
  }
}
