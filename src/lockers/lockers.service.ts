import { Inject, Injectable } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ILockerRepository } from '../common/interfaces';
import { LOCKER_REPOSITORY } from '../common/interfaces';
import { LockerNotFoundException } from '../common/exceptions';
import { LockerSize } from '../common/enums';
import { Locker } from './entities/locker.entity';

export interface LockerResponse {
  id: string;
  size: LockerSize;
  location: string;
  status: string;
}

@Injectable()
export class LockersService {
  private lockerCounter = 0;

  constructor(
    @Inject(LOCKER_REPOSITORY)
    private readonly lockerRepository: ILockerRepository,
  ) {}

  findAll(): LockerResponse[] {
    return this.lockerRepository.findAll().map((locker) => ({
      id: locker.id,
      size: locker.size,
      location: locker.location,
      status: locker.status,
    }));
  }

  create(size: LockerSize, location: string): LockerResponse {
    const id = this.generateLockerId();
    const locker = new Locker(id, size, location);
    this.lockerRepository.save(locker);
    return { id: locker.id, size: locker.size, location: locker.location, status: locker.status };
  }

  update(id: string, size?: LockerSize, location?: string): LockerResponse {
    const locker = this.lockerRepository.findById(id);

    if (!locker) {
      throw new LockerNotFoundException(id);
    }

    if (!locker.isAvailable) {
      throw new HttpException(
        `Locker ${id} is currently occupied and cannot be updated`,
        HttpStatus.CONFLICT,
      );
    }

    if (size) {
      locker.updateSize(size);
    }

    if (location) {
      locker.updateLocation(location);
    }

    return { id: locker.id, size: locker.size, location: locker.location, status: locker.status };
  }

  remove(id: string): { message: string } {
    const locker = this.lockerRepository.findById(id);

    if (!locker) {
      throw new LockerNotFoundException(id);
    }

    if (!locker.isAvailable) {
      throw new HttpException(
        `Locker ${id} is currently occupied and cannot be removed`,
        HttpStatus.CONFLICT,
      );
    }

    this.lockerRepository.remove(id);
    return { message: `Locker ${id} removed successfully` };
  }

  /**
   * Generates a sequential locker ID in the format L-XXX.
   * Ensures uniqueness by checking existing lockers.
   */
  private generateLockerId(): string {
    this.lockerCounter++;
    let id = this.formatLockerId(this.lockerCounter);

    // Skip if ID already exists (e.g., from seeded data)
    while (this.lockerRepository.findById(id)) {
      this.lockerCounter++;
      id = this.formatLockerId(this.lockerCounter);
    }

    return id;
  }

  private formatLockerId(num: number): string {
    return `L-${num.toString().padStart(3, '0')}`;
  }
}
