import { Inject, Injectable } from '@nestjs/common';
import type {
  ILockerRepository,
  IPackageRepository,
  IStorageChargeCalculator,
  IPaymentService,
  StorageChargeBreakdown,
  PaymentResult,
} from '../../common/interfaces';
import {
  LOCKER_REPOSITORY,
  PACKAGE_REPOSITORY,
  STORAGE_CHARGE_CALCULATOR,
  PAYMENT_SERVICE,
} from '../../common/interfaces';
import { LockerStatus } from '../../common/enums';
import {
  InvalidPickupException,
  LockerNotFoundException,
  PaymentFailedException,
} from '../../common/exceptions';
import { Package } from '../entities/package.entity';

export interface RetrievalCheckResult {
  packageId: string;
  lockerId: string;
  recipientName: string;
  storedAt: Date;
  storageCharge: StorageChargeBreakdown;
  message: string;
}

export interface RetrievalConfirmResult {
  packageId: string;
  lockerId: string;
  recipientName: string;
  retrievedAt: Date;
  storageCharge: StorageChargeBreakdown;
  payment: PaymentResult;
  message: string;
}

@Injectable()
export class PackageRetrievalService {
  constructor(
    @Inject(LOCKER_REPOSITORY)
    private readonly lockerRepository: ILockerRepository,
    @Inject(PACKAGE_REPOSITORY)
    private readonly packageRepository: IPackageRepository,
    @Inject(STORAGE_CHARGE_CALCULATOR)
    private readonly storageChargeCalculator: IStorageChargeCalculator,
    @Inject(PAYMENT_SERVICE)
    private readonly paymentService: IPaymentService,
  ) {}

  /**
   * Step 1: Validates the pickup request and returns the storage charge.
   * The locker remains locked — this is a read-only check.
   *
   * Flow:
   * 1. Validate the locker exists
   * 2. Find the stored package in that locker
   * 3. Check if pickup code has expired
   * 4. Validate the pickup code matches
   * 5. Calculate storage charges based on duration so far
   * 6. Return charge breakdown for customer to review before paying
   *
   * @throws LockerNotFoundException if the locker ID is invalid
   * @throws InvalidPickupException if no package, code is wrong, or code is expired
   */
  check(lockerId: string, pickupCode: string): RetrievalCheckResult {
    const pkg = this.validateAndGetPackage(lockerId, pickupCode);

    const storageCharge = this.storageChargeCalculator.calculate(
      pkg.storedAt,
      new Date(),
    );

    return {
      packageId: pkg.id,
      lockerId,
      recipientName: pkg.recipientName,
      storedAt: pkg.storedAt,
      storageCharge,
      message: `Storage charge: ${storageCharge.totalCharge} ${storageCharge.currency}. Please pay and confirm to retrieve your package.`,
    };
  }

  /**
   * Step 2: Processes payment and releases the package.
   * The locker opens and becomes available again.
   *
   * If payment fails, the package remains stored and the locker stays locked.
   *
   * Flow:
   * 1. Re-validate the pickup request (security)
   * 2. Calculate final storage charge
   * 3. Process payment
   * 4. If payment succeeds: mark package as retrieved, release locker
   * 5. If payment fails: throw PaymentFailedException (locker stays locked)
   *
   * @throws LockerNotFoundException if the locker ID is invalid
   * @throws InvalidPickupException if no package, code is wrong, or code is expired
   * @throws PaymentFailedException if payment processing fails
   */
  confirm(lockerId: string, pickupCode: string): RetrievalConfirmResult {
    const pkg = this.validateAndGetPackage(lockerId, pickupCode);

    const storageCharge = this.storageChargeCalculator.calculate(
      pkg.storedAt,
      new Date(),
    );

    // Process payment BEFORE releasing the package
    const payment = this.paymentService.processPayment(
      storageCharge.totalCharge,
      storageCharge.currency,
      pkg.recipientName,
    );

    if (!payment.success) {
      throw new PaymentFailedException();
    }

    // Payment succeeded — now release the package
    pkg.markAsRetrieved();
    this.packageRepository.update(pkg);
    this.lockerRepository.updateStatus(lockerId, LockerStatus.AVAILABLE);

    return {
      packageId: pkg.id,
      lockerId,
      recipientName: pkg.recipientName,
      retrievedAt: pkg.retrievedAt!,
      storageCharge,
      payment,
      message: `Package retrieved successfully. Payment of ${storageCharge.totalCharge} ${storageCharge.currency} processed. Locker is now open.`,
    };
  }

  /**
   * Shared validation logic for both check and confirm steps.
   */
  private validateAndGetPackage(lockerId: string, pickupCode: string): Package {
    const locker = this.lockerRepository.findById(lockerId);
    if (!locker) {
      throw new LockerNotFoundException(lockerId);
    }

    const pkg = this.packageRepository.findByLockerId(lockerId);
    if (!pkg) {
      throw new InvalidPickupException(
        'No active package found in this locker',
      );
    }

    if (pkg.isExpired) {
      throw new InvalidPickupException(
        'Pickup code has expired. Please contact support.',
      );
    }

    if (!this.validatePickupCode(pkg, pickupCode)) {
      throw new InvalidPickupException('Invalid pickup code');
    }

    return pkg;
  }

  private validatePickupCode(pkg: Package, code: string): boolean {
    return pkg.pickupCode === code;
  }
}
