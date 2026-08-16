import { HttpException, HttpStatus } from '@nestjs/common';

export class PackageNotFoundException extends HttpException {
  constructor(packageId: string) {
    super(`Package not found: ${packageId}`, HttpStatus.NOT_FOUND);
  }
}
