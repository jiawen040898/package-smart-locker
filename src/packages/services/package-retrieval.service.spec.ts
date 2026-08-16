import { PackageRetrievalService } from './package-retrieval.service';
import type { ILockerRepository, IPackageRepository, IStorageChargeCalculator, IPaymentService } from '../../common/interfaces';
import { LockerSize, LockerStatus, PackageStatus } from '../../common/enums';
import { Locker } from '../../lockers/entities/locker.entity';
import { Package } from '../entities/package.entity';
import { InvalidPickupException, LockerNotFoundException } from '../../common/exceptions';

describe('PackageRetrievalService', () => {
  let service: PackageRetrievalService;
  let lockerRepository: jest.Mocked<ILockerRepository>;
  let packageRepository: jest.Mocked<IPackageRepository>;
  let storageChargeCalculator: jest.Mocked<IStorageChargeCalculator>;
  let paymentService: jest.Mocked<IPaymentService>;

  const defaultLocation = 'Building A, Ground Floor';
  const mockChargeResult = {
    totalCharge: 4,
    currency: 'MYR',
    daysStored: 2,
    breakdown: [{ tier: 'Standard (Days 1-5)', days: 2, ratePerDay: 2, subtotal: 4 }],
  };
  const mockPaymentResult = {
    success: true,
    transactionId: 'TXN-12345678',
    amount: 4,
    currency: 'MYR',
  };

  beforeEach(() => {
    lockerRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findAvailableBySize: jest.fn(),
      save: jest.fn(),
      updateStatus: jest.fn(),
    };

    packageRepository = {
      findById: jest.fn(),
      findByLockerId: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    storageChargeCalculator = {
      calculate: jest.fn().mockReturnValue(mockChargeResult),
    };

    paymentService = {
      processPayment: jest.fn().mockReturnValue(mockPaymentResult),
    };

    service = new PackageRetrievalService(
      lockerRepository,
      packageRepository,
      storageChargeCalculator,
      paymentService,
    );
  });

  describe('check', () => {
    it('should return storage charge without releasing the package', () => {
      const locker = new Locker('L-001', LockerSize.MEDIUM, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.MEDIUM,
        recipientName: 'John Doe',
        lockerId: 'L-001',
        pickupCode: 'ABC123',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);

      const result = service.check('L-001', 'ABC123');

      expect(result.packageId).toBe('pkg-1');
      expect(result.recipientName).toBe('John Doe');
      expect(result.storageCharge).toEqual(mockChargeResult);
      expect(result.message).toContain('Storage charge');
    });

    it('should not mark package as retrieved or process payment during check', () => {
      const locker = new Locker('L-001', LockerSize.SMALL, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.SMALL,
        recipientName: 'Jane',
        lockerId: 'L-001',
        pickupCode: 'XYZ789',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);

      service.check('L-001', 'XYZ789');

      expect(pkg.status).toBe(PackageStatus.STORED);
      expect(packageRepository.update).not.toHaveBeenCalled();
      expect(lockerRepository.updateStatus).not.toHaveBeenCalled();
      expect(paymentService.processPayment).not.toHaveBeenCalled();
    });

    it('should throw LockerNotFoundException for non-existent locker', () => {
      lockerRepository.findById.mockReturnValue(undefined);

      expect(() => service.check('INVALID', 'ABC123')).toThrow(
        LockerNotFoundException,
      );
    });

    it('should throw InvalidPickupException for wrong pickup code', () => {
      const locker = new Locker('L-001', LockerSize.MEDIUM, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.MEDIUM,
        recipientName: 'John',
        lockerId: 'L-001',
        pickupCode: 'CORRECT',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);

      expect(() => service.check('L-001', 'WRONG')).toThrow(
        InvalidPickupException,
      );
    });

    it('should throw InvalidPickupException when pickup code has expired', () => {
      const locker = new Locker('L-001', LockerSize.SMALL, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.SMALL,
        recipientName: 'Test',
        lockerId: 'L-001',
        pickupCode: 'EXPIRED',
        expiryHours: 0,
      });

      Object.defineProperty(pkg, 'expiresAt', {
        value: new Date(Date.now() - 1000),
        writable: false,
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);

      expect(() => service.check('L-001', 'EXPIRED')).toThrow(
        'Pickup code has expired',
      );
    });
  });

  describe('confirm', () => {
    it('should process payment and release the package', () => {
      const locker = new Locker('L-001', LockerSize.MEDIUM, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.MEDIUM,
        recipientName: 'John Doe',
        lockerId: 'L-001',
        pickupCode: 'ABC123',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);
      packageRepository.update.mockImplementation((p) => p);

      const result = service.confirm('L-001', 'ABC123');

      expect(result.packageId).toBe('pkg-1');
      expect(result.recipientName).toBe('John Doe');
      expect(result.retrievedAt).toBeInstanceOf(Date);
      expect(result.storageCharge).toEqual(mockChargeResult);
      expect(result.payment).toEqual(mockPaymentResult);
      expect(result.message).toContain('Payment');
    });

    it('should call payment service with correct amount', () => {
      const locker = new Locker('L-001', LockerSize.SMALL, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.SMALL,
        recipientName: 'Jane',
        lockerId: 'L-001',
        pickupCode: 'PAY001',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);
      packageRepository.update.mockImplementation((p) => p);

      service.confirm('L-001', 'PAY001');

      expect(paymentService.processPayment).toHaveBeenCalledWith(
        mockChargeResult.totalCharge,
        mockChargeResult.currency,
        'Jane',
      );
    });

    it('should mark the package as retrieved', () => {
      const locker = new Locker('L-001', LockerSize.LARGE, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.LARGE,
        recipientName: 'Bob',
        lockerId: 'L-001',
        pickupCode: 'CODE01',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);
      packageRepository.update.mockImplementation((p) => p);

      service.confirm('L-001', 'CODE01');

      const updatedPkg = packageRepository.update.mock.calls[0][0];
      expect(updatedPkg.status).toBe(PackageStatus.RETRIEVED);
      expect(updatedPkg.retrievedAt).toBeInstanceOf(Date);
    });

    it('should release the locker after confirmation', () => {
      const locker = new Locker('L-001', LockerSize.SMALL, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.SMALL,
        recipientName: 'Jane',
        lockerId: 'L-001',
        pickupCode: 'XYZ789',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);
      packageRepository.update.mockImplementation((p) => p);

      service.confirm('L-001', 'XYZ789');

      expect(lockerRepository.updateStatus).toHaveBeenCalledWith(
        'L-001',
        LockerStatus.AVAILABLE,
      );
    });

    it('should throw LockerNotFoundException for non-existent locker', () => {
      lockerRepository.findById.mockReturnValue(undefined);

      expect(() => service.confirm('INVALID', 'ABC123')).toThrow(
        LockerNotFoundException,
      );
    });

    it('should throw InvalidPickupException for wrong pickup code', () => {
      const locker = new Locker('L-001', LockerSize.MEDIUM, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.MEDIUM,
        recipientName: 'John',
        lockerId: 'L-001',
        pickupCode: 'CORRECT',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);

      expect(() => service.confirm('L-001', 'WRONG')).toThrow(
        InvalidPickupException,
      );
    });

    it('should not process payment or release locker when validation fails', () => {
      const locker = new Locker('L-001', LockerSize.SMALL, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.SMALL,
        recipientName: 'Test',
        lockerId: 'L-001',
        pickupCode: 'SECRET',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);

      try {
        service.confirm('L-001', 'WRONG_CODE');
      } catch {
        // expected
      }

      expect(paymentService.processPayment).not.toHaveBeenCalled();
      expect(lockerRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should not release package when payment fails', () => {
      const locker = new Locker('L-001', LockerSize.MEDIUM, defaultLocation);
      const pkg = new Package({
        id: 'pkg-1',
        size: LockerSize.MEDIUM,
        recipientName: 'Broke Bob',
        lockerId: 'L-001',
        pickupCode: 'PAYFAIL',
      });

      lockerRepository.findById.mockReturnValue(locker);
      packageRepository.findByLockerId.mockReturnValue(pkg);
      paymentService.processPayment.mockReturnValue({
        success: false,
        transactionId: '',
        amount: 4,
        currency: 'MYR',
      });

      expect(() => service.confirm('L-001', 'PAYFAIL')).toThrow(
        'Payment processing failed',
      );

      // Package should NOT be marked as retrieved
      expect(packageRepository.update).not.toHaveBeenCalled();
      // Locker should NOT be released
      expect(lockerRepository.updateStatus).not.toHaveBeenCalled();
    });
  });
});
