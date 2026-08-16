import { TieredStorageChargeCalculator } from './tiered-storage-charge.calculator';

describe('TieredStorageChargeCalculator', () => {
  let calculator: TieredStorageChargeCalculator;

  beforeEach(() => {
    // Base rate of 2 MYR/day
    calculator = new TieredStorageChargeCalculator(2, 'MYR');
  });

  it('should charge 1 day for retrieval within 24 hours', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-01T15:00:00Z'); // 5 hours later

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(1);
    expect(result.totalCharge).toBe(2); // 1 day * 2 MYR
    expect(result.currency).toBe('MYR');
  });

  it('should charge 2 days for retrieval after 25 hours', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-02T11:00:00Z'); // 25 hours later

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(2);
    expect(result.totalCharge).toBe(4); // 2 days * 2 MYR
  });

  it('should apply standard rate for first 5 days', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-06T10:00:00Z'); // Exactly 5 days

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(5);
    expect(result.totalCharge).toBe(10); // 5 * 2
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].tier).toContain('Standard');
    expect(result.breakdown[0].days).toBe(5);
    expect(result.breakdown[0].ratePerDay).toBe(2);
  });

  it('should apply tiered pricing for 7 days (5 standard + 2 extended)', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-08T10:00:00Z'); // 7 days

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(7);
    expect(result.totalCharge).toBe(18); // (5 * 2) + (2 * 4)
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0].days).toBe(5);
    expect(result.breakdown[0].ratePerDay).toBe(2);
    expect(result.breakdown[1].days).toBe(2);
    expect(result.breakdown[1].ratePerDay).toBe(4);
  });

  it('should apply all three tiers for 12 days', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-13T10:00:00Z'); // 12 days

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(12);
    // (5 * 2) + (5 * 4) + (2 * 6) = 10 + 20 + 12 = 42
    expect(result.totalCharge).toBe(42);
    expect(result.breakdown).toHaveLength(3);
    expect(result.breakdown[0].tier).toContain('Standard');
    expect(result.breakdown[0].days).toBe(5);
    expect(result.breakdown[1].tier).toContain('Extended');
    expect(result.breakdown[1].days).toBe(5);
    expect(result.breakdown[2].tier).toContain('Overdue');
    expect(result.breakdown[2].days).toBe(2);
  });

  it('should apply full 10-day pricing correctly', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-11T10:00:00Z'); // 10 days

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(10);
    // (5 * 2) + (5 * 4) = 10 + 20 = 30
    expect(result.totalCharge).toBe(30);
    expect(result.breakdown).toHaveLength(2);
  });

  it('should round up partial days', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-02T10:01:00Z'); // 24 hours + 1 minute

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(2); // Rounded up
    expect(result.totalCharge).toBe(4);
  });

  it('should handle exactly 24 hours as 1 day', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-02T10:00:00Z'); // Exactly 24 hours

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(1);
    expect(result.totalCharge).toBe(2);
  });

  it('should work with a custom base rate', () => {
    const customCalculator = new TieredStorageChargeCalculator(5, 'USD');
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-04T10:00:00Z'); // 3 days

    const result = customCalculator.calculate(storedAt, retrievedAt);

    expect(result.daysStored).toBe(3);
    expect(result.totalCharge).toBe(15); // 3 * 5
    expect(result.currency).toBe('USD');
  });

  it('should provide correct breakdown structure', () => {
    const storedAt = new Date('2025-01-01T10:00:00Z');
    const retrievedAt = new Date('2025-01-03T10:00:00Z'); // 2 days

    const result = calculator.calculate(storedAt, retrievedAt);

    expect(result).toHaveProperty('totalCharge');
    expect(result).toHaveProperty('currency');
    expect(result).toHaveProperty('daysStored');
    expect(result).toHaveProperty('breakdown');
    expect(result.breakdown[0]).toHaveProperty('tier');
    expect(result.breakdown[0]).toHaveProperty('days');
    expect(result.breakdown[0]).toHaveProperty('ratePerDay');
    expect(result.breakdown[0]).toHaveProperty('subtotal');
  });
});
