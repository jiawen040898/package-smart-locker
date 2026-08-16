import { Locker } from '../../lockers/entities/locker.entity';
import { LockerSize } from '../enums';

export const LOCKER_ALLOCATION_STRATEGY = Symbol('LOCKER_ALLOCATION_STRATEGY');

/**
 * Strategy interface for allocating lockers to packages.
 * Implementations define the algorithm for selecting the most appropriate locker.
 */
export interface ILockerAllocationStrategy {
  /**
   * Allocates a suitable locker for the given package size.
   * @param packageSize - The size of the package to be stored
   * @param availableLockers - List of available lockers to choose from
   * @returns The selected locker, or undefined if no suitable locker is found
   */
  allocate(packageSize: LockerSize, availableLockers: Locker[]): Locker | undefined;
}
