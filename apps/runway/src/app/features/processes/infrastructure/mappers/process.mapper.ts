import { Process } from '../../domain/process.entity';
import type { ProcessDefinition } from '../../../../runtime/process-store';

/** DTO (the store's ProcessDefinition) ↔ Domain (Process). */
export const ProcessMapper = {
  toDomain(dto: ProcessDefinition): Process {
    return new Process({
      pathway: dto.pathway,
      version: dto.version,
      graph: dto.graph,
      publishedAt: dto.publishedAt,
    });
  },
};
