import { Module } from '@nestjs/common';
import {
  PACKAGE_REPOSITORY,
  STORAGE_CHARGE_CALCULATOR,
} from '../common/interfaces';
import { InMemoryPackageRepository } from './repositories/in-memory-package.repository';
import { TieredStorageChargeCalculator } from './strategies/tiered-storage-charge.calculator';
import { PickupCodeService } from './services/pickup-code.service';
import { PackageDeliveryService } from './services/package-delivery.service';
import { PackageRetrievalService } from './services/package-retrieval.service';
import { PackagesController } from './packages.controller';
import { LockersModule } from '../lockers/lockers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

const packageRepositoryProvider = {
  provide: PACKAGE_REPOSITORY,
  useClass: InMemoryPackageRepository,
};

const storageChargeCalculatorProvider = {
  provide: STORAGE_CHARGE_CALCULATOR,
  useFactory: () => new TieredStorageChargeCalculator(),
};

@Module({
  imports: [LockersModule, NotificationsModule, PaymentsModule],
  controllers: [PackagesController],
  providers: [
    packageRepositoryProvider,
    storageChargeCalculatorProvider,
    PickupCodeService,
    PackageDeliveryService,
    PackageRetrievalService,
  ],
  exports: [packageRepositoryProvider],
})
export class PackagesModule {}
