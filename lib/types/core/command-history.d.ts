/**
 * @typedef {Object} Command
 * @property {() => void} execute — perform the action
 * @property {() => void} undo — reverse the action
 */
export class CommandHistory {
    /** @param {Command} command */
    execute(command: Command): void;
    undo(): void;
    redo(): void;
    get canUndo(): boolean;
    get canRedo(): boolean;
    clear(): void;
    #private;
}
export type Command = {
    /**
     * — perform the action
     */
    execute: () => void;
    /**
     * — reverse the action
     */
    undo: () => void;
};
