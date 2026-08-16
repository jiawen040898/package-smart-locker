import { Injectable } from '@nestjs/common';
import { ILockerRepository } from '../../common/interfaces';
import { LockerSize, LockerStatus } from '../../common/enums';
import { Locker } from '../entities/locker.entity';

@Injectable()
export class InMemoryLockerRepository implements ILockerRepository {
  private lockers: Map<string, Locker> = new Map();

  findById(id: string): Locker | undefined {
    return this.lockers.get(id);
  }

  findAvailableBySize(size: LockerSize): Locker[] {
    return Array.from(this.lockers.values()).filter(
      (locker) => locker.isAvailable && locker.size === size,
    );
  }

  findAll(): Locker[] {
    return Array.from(this.lockers.values());
  }

  save(locker: Locker): Locker {
    this.lockers.set(locker.id, locker);
    return locker;
  }

  updateStatus(id: string, status: LockerStatus): Locker | undefined {
    const locker = this.lockers.get(id);
    if (!locker) return undefined;

    if (status === LockerStatus.OCCUPIED) {
      locker.occupy();
    } else {
      locker.release();
    }

    return locker;
  }
}
