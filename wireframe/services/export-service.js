export class ExportService {
  exportJSON(state) {
    const json = typeof state.toJSON === 'function'
      ? JSON.stringify(state.toJSON(), null, 2)
      : JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
