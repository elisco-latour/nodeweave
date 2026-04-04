import { CanvasState } from './canvas-state.js';
import { Node, Port, Edge } from './graph.js';

const STAGE_COLUMN_WIDTH = 250;
const STAGE_ROW_HEIGHT = 100;
const BASE_X = 50;
const BASE_Y = 50;

class JobContext {
  #builder;
  #id;
  #parentIds = [];

  constructor(builder, id) {
    this.#builder = builder;
    this.#id = id;
  }

  get id() { return this.#id; }
  get parentIds() { return this.#parentIds; }

  dependsOn(...parentIds) {
    this.#parentIds.push(...parentIds);
    return this;
  }

  addJob(id, name, stage) {
    return this.#builder.addJob(id, name, stage);
  }

  build() {
    return this.#builder.build();
  }
}

export class PipelineBuilder {
  #jobs = new Map();
  #stages = new Map(); // stage → [jobId, ...]

  addJob(id, name, stage = 0) {
    if (this.#jobs.has(id)) {
      throw new Error(`Duplicate job ID: "${id}".`);
    }
    const ctx = new JobContext(this, id);
    this.#jobs.set(id, { id, name, stage, context: ctx });
    if (!this.#stages.has(stage)) {
      this.#stages.set(stage, []);
    }
    this.#stages.get(stage).push(id);
    return ctx;
  }

  build() {
    // Validate all dependencies exist
    for (const [jobId, job] of this.#jobs) {
      for (const parentId of job.context.parentIds) {
        if (!this.#jobs.has(parentId)) {
          throw new Error(`Job "${jobId}" depends on unknown job "${parentId}".`);
        }
      }
    }

    const state = new CanvasState();

    // Sort stages for consistent column assignment
    const sortedStages = Array.from(this.#stages.keys()).sort((a, b) => a - b);

    // Create nodes with ports, assign positions by stage column and row
    for (const stage of sortedStages) {
      const jobIds = this.#stages.get(stage);
      const colX = BASE_X + stage * STAGE_COLUMN_WIDTH;
      jobIds.forEach((jobId, rowIndex) => {
        const job = this.#jobs.get(jobId);
        const node = new Node({
          id: jobId,
          type: 'job',
          metadata: { name: job.name, stage: job.stage },
          x: colX,
          y: BASE_Y + rowIndex * STAGE_ROW_HEIGHT,
        });
        // Every job gets an input and output port
        node.addPort(new Port({ id: `${jobId}:in`, direction: 'in', nodeId: jobId, positionHint: 'left' }));
        node.addPort(new Port({ id: `${jobId}:out`, direction: 'out', nodeId: jobId, positionHint: 'right' }));
        state.addNode(node);
      });
    }

    // Create edges from dependencies
    let edgeIndex = 0;
    for (const [jobId, job] of this.#jobs) {
      for (const parentId of job.context.parentIds) {
        const edge = new Edge({
          id: `edge-${edgeIndex++}`,
          sourcePortId: `${parentId}:out`,
          targetPortId: `${jobId}:in`,
        });
        state.addEdge(edge); // Cycle detection happens inside addEdge
      }
    }

    return state;
  }
}
