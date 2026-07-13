import { Case } from '../../domain/case.entity';
import type { ReadinessRecord } from '../../../../domain/model';

/** DTO (the runtime's raw ReadinessRecord) ↔ Domain (Case). */
export const CaseMapper = {
  toDomain(dto: ReadinessRecord): Case {
    return new Case(dto);
  },
};
