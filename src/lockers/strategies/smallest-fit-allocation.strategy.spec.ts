import { SmallestFitAllocationStrategy } from './smallest-fit-allocation.strategy';
import { Locker } from '../entities/locker.entity';
import { LockerSize } from '../../common/enums';

describe('SmallestFitAllocationStrategy', () => {
  let strategy: SmallestFitAllocationStrategy;
  const defaultLocation = 'Test Location';

  beforeEach(() => {
    strategy = new SmallestFitAllocationStrategy();
  });

  it('should allocate the smallest locker that fits a SMALL package', () => {
    const lockers = [
      new Locker('L-1', LockerSize.LARGE, defaultLocation),
      new Locker('L-2', LockerSize.SMALL, defaultLocation),
      new Locker('L-3', LockerSize.MEDIUM, defaultLocation),
    ];

    const result = strategy.allocate(LockerSize.SMALL, lockers);

    expect(result).toBeDefined();
    expect(result!.id).toBe('L-2');
    expect(result!.size).toBe(LockerSize.SMALL);
  });

  it('should allocate a MEDIUM locker for a MEDIUM package when no SMALL is available', () => {
    const lockers = [
      new Locker('L-1', LockerSize.LARGE, defaultLocation),
      new Locker('L-2', LockerSize.MEDIUM, defaultLocation),
    ];

    const result = strategy.allocate(LockerSize.MEDIUM, lockers);

    expect(result).toBeDefined();
    expect(result!.id).toBe('L-2');
  });

  it('should allocate a LARGE locker for a LARGE package', () => {
    const lockers = [
      new Locker('L-1', LockerSize.LARGE, defaultLocation),
      new Locker('L-2', LockerSize.SMALL, defaultLocation),
    ];

    const result = strategy.allocate(LockerSize.LARGE, lockers);

    expect(result).toBeDefined();
    expect(result!.id).toBe('L-1');
  });

  it('should allocate a larger locker if the exact size is unavailable', () => {
    const lockers = [
      new Locker('L-1', LockerSize.LARGE, defaultLocation),
      new Locker('L-2', LockerSize.MEDIUM, defaultLocation),
    ];

    const result = strategy.allocate(LockerSize.SMALL, lockers);

    expect(result).toBeDefined();
    expect(result!.id).toBe('L-2'); // MEDIUM is smallest that fits SMALL
  });

  it('should return undefined when no suitable locker is available', () => {
    const lockers = [
      new Locker('L-1', LockerSize.SMALL, defaultLocation),
      new Locker('L-2', LockerSize.SMALL, defaultLocation),
    ];

    const result = strategy.allocate(LockerSize.LARGE, lockers);

    expect(result).toBeUndefined();
  });

  it('should return undefined when locker list is empty', () => {
    const result = strategy.allocate(LockerSize.SMALL, []);

    expect(result).toBeUndefined();
  });

  it('should not allocate a smaller locker for a larger package', () => {
    const lockers = [new Locker('L-1', LockerSize.SMALL, defaultLocation)];

    const result = strategy.allocate(LockerSize.MEDIUM, lockers);

    expect(result).toBeUndefined();
  });

  it('should prefer the smallest fitting locker when multiple sizes are available', () => {
    const lockers = [
      new Locker('L-1', LockerSize.LARGE, defaultLocation),
      new Locker('L-2', LockerSize.MEDIUM, defaultLocation),
      new Locker('L-3', LockerSize.SMALL, defaultLocation),
      new Locker('L-4', LockerSize.MEDIUM, defaultLocation),
    ];

    const result = strategy.allocate(LockerSize.MEDIUM, lockers);

    expect(result).toBeDefined();
    expect(result!.size).toBe(LockerSize.MEDIUM);
  });
});
