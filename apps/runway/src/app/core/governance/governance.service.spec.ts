import { describe, it, expect } from 'vitest';
import { GovernanceService } from './governance.service';

describe('GovernanceService', () => {
  it('masks personal data by default and reveals it once authorized', () => {
    const gov = new GovernanceService();
    expect(gov.piiRevealed()).toBe(false);

    const masked = gov.mask('Aïsha Bello');
    expect(masked).not.toBe('Aïsha Bello');
    expect(masked).toContain('•');

    gov.toggle();
    expect(gov.piiRevealed()).toBe(true);
    expect(gov.mask('Aïsha Bello')).toBe('Aïsha Bello');
  });

  it('reveal() and hide() set the authorization explicitly', () => {
    const gov = new GovernanceService();
    gov.reveal();
    expect(gov.piiRevealed()).toBe(true);
    gov.hide();
    expect(gov.piiRevealed()).toBe(false);
  });
});
