import { HttpException, HttpStatus } from '@nestjs/common';

export class LockerNotFoundException extends HttpException {
  constructor(lockerId: string) {
    super(`Locker not found: ${lockerId}`, HttpStatus.NOT_FOUND);
  }
}
