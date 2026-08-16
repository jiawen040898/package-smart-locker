import { PickupCodeService } from './pickup-code.service';

describe('PickupCodeService', () => {
  let service: PickupCodeService;

  beforeEach(() => {
    service = new PickupCodeService();
  });

  it('should generate a 6-character code', () => {
    const code = service.generate();
    expect(code).toHaveLength(6);
  });

  it('should only contain allowed characters', () => {
    const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 100; i++) {
      const code = service.generate();
      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    }
  });

  it('should not contain confusing characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const code = service.generate();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('should generate unique codes (high probability)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(service.generate());
    }
    // With 32^6 possible combinations, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});
