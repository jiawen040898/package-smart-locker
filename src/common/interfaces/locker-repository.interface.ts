import { Locker } from '../../lockers/entities/locker.entity';
import { LockerSize, LockerStatus } from '../enums';

export const LOCKER_REPOSITORY = Symbol('LOCKER_REPOSITORY');

export interface ILockerRepository {
  findById(id: string): Locker | undefined;
  findAvailableBySize(size: LockerSize): Locker[];
  findAll(): Locker[];
  save(locker: Locker): Locker;
  updateStatus(id: string, status: LockerStatus): Locker | undefined;
  remove(id: string): boolean;
}
