/**
 * @typedef {Object} Command
 * @property {() => void} execute — perform the action
 * @property {() => void} undo — reverse the action
 */

export class CommandHistory {
  /** @type {Command[]} */ #undoStack = [];
  /** @type {Command[]} */ #redoStack = [];

  /** @param {Command} command */
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
