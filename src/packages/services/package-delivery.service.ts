import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ILockerRepository, IPackageRepository, ILockerAllocationStrategy, INotificationService } from '../../common/interfaces';
import {
  LOCKER_REPOSITORY,
  PACKAGE_REPOSITORY,
  LOCKER_ALLOCATION_STRATEGY,
  NOTIFICATION_SERVICE,
} from '../../common/interfaces';
import { LockerSize, LockerStatus } from '../../common/enums';
import { LockerNotAvailableException } from '../../common/exceptions';
import { Package } from '../entities/package.entity';
import { PickupCodeService } from './pickup-code.service';
import { Mutex } from '../../common/locks/mutex';

export interface DeliveryResult {
  packageId: string;
  lockerId: string;
  lockerSize: LockerSize;
  lockerLocation: string;
  pickupCode: string;
  recipientName: string;
  storedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class PackageDeliveryService {
  private readonly allocationMutex = new Mutex();

  constructor(
    @Inject(LOCKER_REPOSITORY)
    private readonly lockerRepository: ILockerRepository,
    @Inject(PACKAGE_REPOSITORY)
    private readonly packageRepository: IPackageRepository,
    @Inject(LOCKER_ALLOCATION_STRATEGY)
    private readonly allocationStrategy: ILockerAllocationStrategy,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: INotificationService,
    private readonly pickupCodeService: PickupCodeService,
  ) {}

  /**
   * Stores a package in the most suitable available locker.
   *
   * Uses a mutex to prevent race conditions when multiple delivery agents
   * store packages concurrently. The lock ensures that locker allocation
   * and status update are atomic — two requests will never receive the same locker.
   *
   * Flow:
   * 1. Acquire allocation lock
   * 2. Find all available lockers
   * 3. Use allocation strategy to select the best-fit locker
   * 4. Mark the locker as occupied (within lock)
   * 5. Release allocation lock
   * 6. Generate pickup code and create package record
   * 7. Send notification to customer
   *
   * @throws LockerNotAvailableException if no suitable locker is available
   */
  async deliver(packageSize: LockerSize, recipientName: string): Promise<DeliveryResult> {
    // Critical section: allocation + occupation must be atomic
    await this.allocationMutex.acquire();

    let selectedLocker;
    try {
      const availableLockers = this.lockerRepository.findAll().filter((l) => l.isAvailable);
      selectedLocker = this.allocationStrategy.allocate(packageSize, availableLockers);

      if (!selectedLocker) {
        throw new LockerNotAvailableException(packageSize);
      }

      // Mark as occupied while still holding the lock
      this.lockerRepository.updateStatus(selectedLocker.id, LockerStatus.OCCUPIED);
    } finally {
      this.allocationMutex.release();
    }

    // Outside lock: these operations don't need serialization
    const pickupCode = this.pickupCodeService.generate();

    const pkg = new Package({
      id: randomUUID(),
      size: packageSize,
      recipientName,
      lockerId: selectedLocker.id,
      pickupCode,
    });

    this.packageRepository.save(pkg);

    this.notificationService.sendPickupNotification({
      recipientName,
      pickupCode,
      lockerId: selectedLocker.id,
      lockerLocation: selectedLocker.location,
      expiresAt: pkg.expiresAt,
    });

    return {
      packageId: pkg.id,
      lockerId: selectedLocker.id,
      lockerSize: selectedLocker.size,
      lockerLocation: selectedLocker.location,
      pickupCode: pkg.pickupCode,
      recipientName: pkg.recipientName,
      storedAt: pkg.storedAt,
      expiresAt: pkg.expiresAt,
    };
  }
}
