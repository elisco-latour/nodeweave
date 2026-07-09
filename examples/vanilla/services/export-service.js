export class ExportService {
  toJSON(canvasState) {
    return JSON.stringify(canvasState.toJSON(), null, 2);
  }

  async toPNG(canvasWorkspaceElement) {
    try {
      const shadow = canvasWorkspaceElement.shadowRoot;
      const viewportEl = shadow.querySelector('.viewport');
      const rect = canvasWorkspaceElement.getBoundingClientRect();
      const width = Math.round(rect.width) || 800;
      const height = Math.round(rect.height) || 600;

      const serializer = new XMLSerializer();
      const html = serializer.serializeToString(viewportEl);
      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
        </foreignObject>
      </svg>`;

      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob returned null'));
            }
          }, 'image/png');
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          // Fallback: return JSON as a text blob
          const jsonStr = this.toJSON(canvasWorkspaceElement.state);
          resolve(new Blob([jsonStr], { type: 'application/json' }));
        };
        img.src = url;
      });
    } catch {
      // Fallback: return JSON as a text blob
      const jsonStr = this.toJSON(canvasWorkspaceElement.state);
      return new Blob([jsonStr], { type: 'application/json' });
    }
  }
}
