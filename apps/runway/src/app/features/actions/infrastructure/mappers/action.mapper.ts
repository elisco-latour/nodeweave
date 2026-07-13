import { Action } from '../../domain/action.entity';
import type { ActionItem } from '../../../../domain/model';

/** DTO (the runtime's raw ActionItem) ↔ Domain (Action). `joinerName` is denormalised from the case by the repository. */
export const ActionMapper = {
  toDomain(dto: ActionItem, joinerName: string): Action {
    return new Action({
      id: dto.id,
      caseRef: dto.caseRef,
      kind: dto.kind,
      title: dto.title,
      reason: dto.reason,
      impactedItems: dto.impactedItems,
      recommendation: dto.recommendation,
      evidence: dto.evidence,
      createdAt: dto.createdAt,
      status: dto.status,
      joinerName,
    });
  },
};
