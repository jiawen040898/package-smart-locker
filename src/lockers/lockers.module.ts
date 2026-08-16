import { Module } from '@nestjs/common';
import { LOCKER_REPOSITORY, LOCKER_ALLOCATION_STRATEGY } from '../common/interfaces';
import { InMemoryLockerRepository } from './repositories/in-memory-locker.repository';
import { SmallestFitAllocationStrategy } from './strategies/smallest-fit-allocation.strategy';
import { LockersController } from './lockers.controller';
import { LockersService } from './lockers.service';

const lockerRepositoryProvider = {
  provide: LOCKER_REPOSITORY,
  useClass: InMemoryLockerRepository,
};

const allocationStrategyProvider = {
  provide: LOCKER_ALLOCATION_STRATEGY,
  useClass: SmallestFitAllocationStrategy,
};

@Module({
  controllers: [LockersController],
  providers: [lockerRepositoryProvider, allocationStrategyProvider, LockersService],
  exports: [lockerRepositoryProvider, allocationStrategyProvider],
})
export class LockersModule {}
