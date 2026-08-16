import { LockerSize, LockerStatus } from '../../common/enums';

export class Locker {
  readonly id: string;
  readonly size: LockerSize;
  readonly location: string;
  private _status: LockerStatus;

  constructor(
    id: string,
    size: LockerSize,
    location: string,
    status: LockerStatus = LockerStatus.AVAILABLE,
  ) {
    this.id = id;
    this.size = size;
    this.location = location;
    this._status = status;
  }

  get status(): LockerStatus {
    return this._status;
  }

  get isAvailable(): boolean {
    return this._status === LockerStatus.AVAILABLE;
  }

  occupy(): void {
    this._status = LockerStatus.OCCUPIED;
  }

  release(): void {
    this._status = LockerStatus.AVAILABLE;
  }
}
