import { HttpException, HttpStatus } from '@nestjs/common';
import { LockerSize } from '../enums';

export class LockerNotAvailableException extends HttpException {
  constructor(size: LockerSize) {
    super(
      `No available locker found that can accommodate package size: ${size}`,
      HttpStatus.CONFLICT,
    );
  }
}
