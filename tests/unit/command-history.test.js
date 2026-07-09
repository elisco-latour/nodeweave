import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommandHistory } from '../../dist/core/command-history.js';

function createMockCommand() {
  const calls = { execute: 0, undo: 0 };
  return {
    execute() { calls.execute++; },
    undo() { calls.undo++; },
    calls,
  };
}

describe('CommandHistory', () => {
  it('execute sets canUndo true and canRedo false', () => {
    const history = new CommandHistory();
    const cmd = createMockCommand();
    history.execute(cmd);
    assert.equal(history.canUndo, true);
    assert.equal(history.canRedo, false);
  });

  it('undo calls command.undo()', () => {
    const history = new CommandHistory();
    const cmd = createMockCommand();
    history.execute(cmd);
    history.undo();
    assert.equal(cmd.calls.undo, 1);
    assert.equal(history.canUndo, false);
    assert.equal(history.canRedo, true);
  });

  it('redo after undo calls command.execute() again', () => {
    const history = new CommandHistory();
    const cmd = createMockCommand();
    history.execute(cmd);
    history.undo();
    history.redo();
    assert.equal(cmd.calls.execute, 2);
    assert.equal(history.canUndo, true);
    assert.equal(history.canRedo, false);
  });

  it('execute after undo clears redo stack', () => {
    const history = new CommandHistory();
    const cmd1 = createMockCommand();
    const cmd2 = createMockCommand();
    history.execute(cmd1);
    history.undo();
    assert.equal(history.canRedo, true);
    history.execute(cmd2);
    assert.equal(history.canRedo, false);
  });

  it('clear() empties both stacks', () => {
    const history = new CommandHistory();
    history.execute(createMockCommand());
    history.execute(createMockCommand());
    history.undo();
    assert.equal(history.canUndo, true);
    assert.equal(history.canRedo, true);
    history.clear();
    assert.equal(history.canUndo, false);
    assert.equal(history.canRedo, false);
  });

  it('undo on empty stack is a no-op', () => {
    const history = new CommandHistory();
    assert.doesNotThrow(() => history.undo());
    assert.equal(history.canUndo, false);
    assert.equal(history.canRedo, false);
  });

  it('redo on empty stack is a no-op', () => {
    const history = new CommandHistory();
    assert.doesNotThrow(() => history.redo());
    assert.equal(history.canUndo, false);
    assert.equal(history.canRedo, false);
  });
});
