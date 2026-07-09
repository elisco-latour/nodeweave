import { CanvasState } from './canvas-state.js';
import { Node, Port, Edge } from './graph.js';

const STAGE_COLUMN_WIDTH = 250;
const STAGE_ROW_HEIGHT = 100;
const BASE_X = 50;
const BASE_Y = 50;

class JobContext {
  readonly #builder: PipelineBuilder;
  readonly #id: string;
  readonly #parentIds: string[] = [];

  constructor(builder: PipelineBuilder, id: string) {
    this.#builder = builder;
    this.#id = id;
  }

  get id(): string { return this.#id; }
  get parentIds(): string[] { return this.#parentIds; }

  dependsOn(...parentIds: string[]): JobContext {
    this.#parentIds.push(...parentIds);
    return this;
  }

  addJob(id: string, name: string, stage?: number): JobContext {
    return this.#builder.addJob(id, name, stage);
  }

  build(): CanvasState {
    return this.#builder.build();
  }
}

interface JobEntry {
  id: string;
  name: string;
  stage: number;
  context: JobContext;
}

export class PipelineBuilder {
  readonly #jobs: Map<string, JobEntry> = new Map();
  readonly #stages: Map<number, string[]> = new Map();

  addJob(id: string, name: string, stage = 0): JobContext {
    if (this.#jobs.has(id)) throw new Error(`Duplicate job ID: "${id}".`);
    const ctx = new JobContext(this, id);
    this.#jobs.set(id, { id, name, stage, context: ctx });
    if (!this.#stages.has(stage)) this.#stages.set(stage, []);
    this.#stages.get(stage)!.push(id);
    return ctx;
  }

  build(): CanvasState {
    for (const [jobId, job] of this.#jobs) {
      for (const parentId of job.context.parentIds) {
        if (!this.#jobs.has(parentId)) {
          throw new Error(`Job "${jobId}" depends on unknown job "${parentId}".`);
        }
      }
    }

    const state = new CanvasState();
    const sortedStages = Array.from(this.#stages.keys()).sort((a, b) => a - b);

    for (const stage of sortedStages) {
      const jobIds = this.#stages.get(stage)!;
      const colX = BASE_X + stage * STAGE_COLUMN_WIDTH;
      jobIds.forEach((jobId, rowIndex) => {
        const job = this.#jobs.get(jobId)!;
        const node = new Node({
          id: jobId,
          type: 'job',
          metadata: { name: job.name, stage: job.stage },
          x: colX,
          y: BASE_Y + rowIndex * STAGE_ROW_HEIGHT,
        });
        node.addPort(new Port({ id: `${jobId}:in`, direction: 'in', nodeId: jobId, positionHint: 'left' }));
        node.addPort(new Port({ id: `${jobId}:out`, direction: 'out', nodeId: jobId, positionHint: 'right' }));
        state.addNode(node);
      });
    }

    let edgeIndex = 0;
    for (const [jobId, job] of this.#jobs) {
      for (const parentId of job.context.parentIds) {
        state.addEdge(new Edge({
          id: `edge-${edgeIndex++}`,
          sourcePortId: `${parentId}:out`,
          targetPortId: `${jobId}:in`,
        }));
      }
    }

    return state;
  }
}
