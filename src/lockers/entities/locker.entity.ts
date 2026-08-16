import { LockerSize, LockerStatus } from '../../common/enums';

export class Locker {
  readonly id: string;
  private _size: LockerSize;
  private _location: string;
  private _status: LockerStatus;

  constructor(
    id: string,
    size: LockerSize,
    location: string,
    status: LockerStatus = LockerStatus.AVAILABLE,
  ) {
    this.id = id;
    this._size = size;
    this._location = location;
    this._status = status;
  }

  get size(): LockerSize {
    return this._size;
  }

  get location(): string {
    return this._location;
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

  updateSize(size: LockerSize): void {
    this._size = size;
  }

  updateLocation(location: string): void {
    this._location = location;
  }
}
