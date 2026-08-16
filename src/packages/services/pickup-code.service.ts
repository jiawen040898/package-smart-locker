import { Injectable } from '@nestjs/common';

/**
 * Service responsible for generating unique pickup codes.
 * Separated into its own service following SRP — generation logic
 * can be swapped independently (e.g., alphanumeric, numeric-only, QR codes).
 */
@Injectable()
export class PickupCodeService {
  /**
   * Generates a 6-character alphanumeric pickup code.
   * In production, this could use a more sophisticated algorithm
   * to ensure uniqueness across a distributed system.
   */
  generate(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }
}
