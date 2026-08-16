import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { LockersModule } from './lockers/lockers.module';
import { PackagesModule } from './packages/packages.module';
import type { ILockerRepository } from './common/interfaces';
import { LOCKER_REPOSITORY } from './common/interfaces';
import { Locker } from './lockers/entities/locker.entity';
import { LockerSize } from './common/enums';

@Module({
  imports: [LockersModule, PackagesModule],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(LOCKER_REPOSITORY)
    private readonly lockerRepository: ILockerRepository,
  ) {}

  /**
   * Seeds the system with an initial set of lockers on startup.
   * In production, this would be loaded from a database or configuration.
   */
  onModuleInit() {
    const initialLockers = [
      new Locker('L-001', LockerSize.SMALL, 'Building A, Ground Floor, Lobby'),
      new Locker('L-002', LockerSize.SMALL, 'Building A, Ground Floor, Lobby'),
      new Locker('L-003', LockerSize.SMALL, 'Building A, Ground Floor, Lobby'),
      new Locker('L-004', LockerSize.MEDIUM, 'Building A, Ground Floor, Lobby'),
      new Locker('L-005', LockerSize.MEDIUM, 'Building B, Level 1, Near Lift'),
      new Locker('L-006', LockerSize.LARGE, 'Building B, Level 1, Near Lift'),
      new Locker('L-007', LockerSize.LARGE, 'Building B, Level 1, Near Lift'),
    ];

    initialLockers.forEach((locker) => this.lockerRepository.save(locker));
  }
}
