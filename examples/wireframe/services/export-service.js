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

  static exportPNG(state, visualRegistry) {
    try {
      if (!state || state.nodes.size === 0) return;

      const padding = 40;
      const dpr = window.devicePixelRatio || 1;

      // Compute bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const node of state.nodes.values()) {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + (node.width || 280));
        maxY = Math.max(maxY, node.y + (node.height || 120));
      }

      const w = maxX - minX + padding * 2;
      const h = maxY - minY + padding * 2;
      const offX = -minX + padding;
      const offY = -minY + padding;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Build port position map for edges
      const portPositions = new Map();
      for (const node of state.nodes.values()) {
        const nw = node.width || 280;
        const nh = node.height || 120;
        const inPorts = [];
        const outPorts = [];
        for (const port of node.ports.values()) {
          if (port.direction === 'in') inPorts.push(port);
          else outPorts.push(port);
        }
        for (let i = 0; i < inPorts.length; i++) {
          portPositions.set(inPorts[i].id, {
            x: node.x + offX,
            y: node.y + offY + nh * (i + 1) / (inPorts.length + 1),
          });
        }
        for (let i = 0; i < outPorts.length; i++) {
          portPositions.set(outPorts[i].id, {
            x: node.x + offX + nw,
            y: node.y + offY + nh * (i + 1) / (outPorts.length + 1),
          });
        }
      }

      // Draw edges
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      for (const edge of state.edges.values()) {
        const src = portPositions.get(edge.sourcePortId);
        const tgt = portPositions.get(edge.targetPortId);
        if (!src || !tgt) continue;
        const dx = Math.abs(tgt.x - src.x) * 0.5;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.bezierCurveTo(src.x + dx, src.y, tgt.x - dx, tgt.y, tgt.x, tgt.y);
        ctx.stroke();
      }

      // Draw nodes
      const headerH = 36;
      const radius = 10;
      for (const node of state.nodes.values()) {
        const nw = node.width || 280;
        const nh = node.height || 120;
        const nx = node.x + offX;
        const ny = node.y + offY;
        const visual = visualRegistry && visualRegistry.has(node.type)
          ? visualRegistry.get(node.type)
          : { label: node.type, color: '#64748b' };

        // Node body (rounded rect)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ExportService.#roundRect(ctx, nx, ny, nw, nh, radius);
        ctx.fill();
        ctx.stroke();

        // Header bar
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(nx + radius, ny);
        ctx.lineTo(nx + nw - radius, ny);
        ctx.arcTo(nx + nw, ny, nx + nw, ny + radius, radius);
        ctx.lineTo(nx + nw, ny + headerH);
        ctx.lineTo(nx, ny + headerH);
        ctx.lineTo(nx, ny + radius);
        ctx.arcTo(nx, ny, nx + radius, ny, radius);
        ctx.closePath();
        ctx.fillStyle = visual.color;
        ctx.fill();
        ctx.restore();

        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(visual.label, nx + 12, ny + headerH / 2);

        // Port dots
        const inPorts = [];
        const outPorts = [];
        for (const port of node.ports.values()) {
          if (port.direction === 'in') inPorts.push(port);
          else outPorts.push(port);
        }
        for (let i = 0; i < inPorts.length; i++) {
          const py = ny + nh * (i + 1) / (inPorts.length + 1);
          ctx.beginPath();
          ctx.arc(nx, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#94a3b8';
          ctx.fill();
        }
        for (let i = 0; i < outPorts.length; i++) {
          const py = ny + nh * (i + 1) / (outPorts.length + 1);
          ctx.beginPath();
          ctx.arc(nx + nw, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#94a3b8';
          ctx.fill();
        }
      }

      canvas.toBlob((blob) => {
        if (blob) {
          ExportService.#triggerDownload(blob, 'pipeline.png');
        }
      }, 'image/png');
    } catch (err) {
      console.warn('PNG export failed', err);
    }
  }

  static #roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  static #triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
