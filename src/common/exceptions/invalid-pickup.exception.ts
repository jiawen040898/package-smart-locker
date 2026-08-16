import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidPickupException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
