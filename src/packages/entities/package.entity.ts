import { LockerSize, PackageStatus } from '../../common/enums';

/** Default pickup expiry window in hours */
const DEFAULT_EXPIRY_HOURS = 48;

export class Package {
  readonly id: string;
  readonly size: LockerSize;
  readonly recipientName: string;
  lockerId: string;
  pickupCode: string;
  status: PackageStatus;
  readonly storedAt: Date;
  readonly expiresAt: Date;
  retrievedAt: Date | null;

  constructor(params: {
    id: string;
    size: LockerSize;
    recipientName: string;
    lockerId: string;
    pickupCode: string;
    expiryHours?: number;
  }) {
    this.id = params.id;
    this.size = params.size;
    this.recipientName = params.recipientName;
    this.lockerId = params.lockerId;
    this.pickupCode = params.pickupCode;
    this.status = PackageStatus.STORED;
    this.storedAt = new Date();
    this.expiresAt = this.calculateExpiry(
      params.expiryHours ?? DEFAULT_EXPIRY_HOURS,
    );
    this.retrievedAt = null;
  }

  get isStored(): boolean {
    return this.status === PackageStatus.STORED;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  markAsRetrieved(): void {
    this.status = PackageStatus.RETRIEVED;
    this.retrievedAt = new Date();
  }

  private calculateExpiry(hours: number): Date {
    const expiry = new Date(this.storedAt);
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }
}
