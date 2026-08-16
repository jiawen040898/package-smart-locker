import { Injectable } from '@nestjs/common';
import { ILockerAllocationStrategy } from '../../common/interfaces';
import { LockerSize, LOCKER_SIZE_ORDER } from '../../common/enums';
import { Locker } from '../entities/locker.entity';

/**
 * Allocates the smallest available locker that can accommodate the package.
 *
 * Algorithm:
 * 1. Filter lockers that are large enough to fit the package
 * 2. Sort by size (ascending)
 * 3. Return the first (smallest) match
 *
 * This optimizes space utilization by avoiding wasting large lockers on small packages.
 */
@Injectable()
export class SmallestFitAllocationStrategy implements ILockerAllocationStrategy {
  allocate(
    packageSize: LockerSize,
    availableLockers: Locker[],
  ): Locker | undefined {
    const packageSizeOrder = LOCKER_SIZE_ORDER[packageSize];

    const suitableLockers = availableLockers
      .filter((locker) => LOCKER_SIZE_ORDER[locker.size] >= packageSizeOrder)
      .sort((a, b) => LOCKER_SIZE_ORDER[a.size] - LOCKER_SIZE_ORDER[b.size]);

    return suitableLockers[0];
  }
}
