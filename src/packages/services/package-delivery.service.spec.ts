import { PackageDeliveryService } from './package-delivery.service';
import { PickupCodeService } from './pickup-code.service';
import type {
  ILockerRepository,
  IPackageRepository,
  ILockerAllocationStrategy,
  INotificationService,
} from '../../common/interfaces';
import { LockerSize, LockerStatus } from '../../common/enums';
import { Locker } from '../../lockers/entities/locker.entity';
import { LockerNotAvailableException } from '../../common/exceptions';

describe('PackageDeliveryService', () => {
  let service: PackageDeliveryService;
  let lockerRepository: jest.Mocked<ILockerRepository>;
  let packageRepository: jest.Mocked<IPackageRepository>;
  let allocationStrategy: jest.Mocked<ILockerAllocationStrategy>;
  let notificationService: jest.Mocked<INotificationService>;
  let pickupCodeService: jest.Mocked<PickupCodeService>;

  const defaultLocation = 'Building A, Ground Floor';

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

    allocationStrategy = {
      allocate: jest.fn(),
    };

    notificationService = {
      sendPickupNotification: jest.fn(),
    };

    pickupCodeService = {
      generate: jest.fn(),
    };

    service = new PackageDeliveryService(
      lockerRepository,
      packageRepository,
      allocationStrategy,
      notificationService,
      pickupCodeService,
    );
  });

  it('should successfully deliver a package to the allocated locker', async () => {
    const availableLocker = new Locker(
      'L-001',
      LockerSize.SMALL,
      defaultLocation,
    );
    lockerRepository.findAll.mockReturnValue([availableLocker]);
    allocationStrategy.allocate.mockReturnValue(availableLocker);
    pickupCodeService.generate.mockReturnValue('ABC123');
    packageRepository.save.mockImplementation((pkg) => pkg);

    const result = await service.deliver(LockerSize.SMALL, 'John Doe');

    expect(result.lockerId).toBe('L-001');
    expect(result.lockerSize).toBe(LockerSize.SMALL);
    expect(result.lockerLocation).toBe(defaultLocation);
    expect(result.pickupCode).toBe('ABC123');
    expect(result.recipientName).toBe('John Doe');
    expect(result.packageId).toBeDefined();
    expect(result.storedAt).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('should mark the locker as occupied after delivery', async () => {
    const availableLocker = new Locker(
      'L-001',
      LockerSize.MEDIUM,
      defaultLocation,
    );
    lockerRepository.findAll.mockReturnValue([availableLocker]);
    allocationStrategy.allocate.mockReturnValue(availableLocker);
    pickupCodeService.generate.mockReturnValue('XYZ789');
    packageRepository.save.mockImplementation((pkg) => pkg);

    await service.deliver(LockerSize.MEDIUM, 'Jane Doe');

    expect(lockerRepository.updateStatus).toHaveBeenCalledWith(
      'L-001',
      LockerStatus.OCCUPIED,
    );
  });

  it('should send notification to customer after successful delivery', async () => {
    const availableLocker = new Locker(
      'L-001',
      LockerSize.LARGE,
      'Building B, Level 2',
    );
    lockerRepository.findAll.mockReturnValue([availableLocker]);
    allocationStrategy.allocate.mockReturnValue(availableLocker);
    pickupCodeService.generate.mockReturnValue('NOTIFY');
    packageRepository.save.mockImplementation((pkg) => pkg);

    await service.deliver(LockerSize.LARGE, 'Bob Smith');

    expect(notificationService.sendPickupNotification).toHaveBeenCalledWith({
      recipientName: 'Bob Smith',
      pickupCode: 'NOTIFY',
      lockerId: 'L-001',
      lockerLocation: 'Building B, Level 2',
      expiresAt: expect.any(Date),
    });
  });

  it('should save the package to the repository', async () => {
    const availableLocker = new Locker(
      'L-001',
      LockerSize.LARGE,
      defaultLocation,
    );
    lockerRepository.findAll.mockReturnValue([availableLocker]);
    allocationStrategy.allocate.mockReturnValue(availableLocker);
    pickupCodeService.generate.mockReturnValue('DEF456');
    packageRepository.save.mockImplementation((pkg) => pkg);

    await service.deliver(LockerSize.LARGE, 'Bob Smith');

    expect(packageRepository.save).toHaveBeenCalledTimes(1);
    const savedPkg = packageRepository.save.mock.calls[0][0];
    expect(savedPkg.lockerId).toBe('L-001');
    expect(savedPkg.recipientName).toBe('Bob Smith');
    expect(savedPkg.pickupCode).toBe('DEF456');
  });

  it('should throw LockerNotAvailableException when no suitable locker exists', async () => {
    lockerRepository.findAll.mockReturnValue([]);
    allocationStrategy.allocate.mockReturnValue(undefined);

    await expect(
      service.deliver(LockerSize.LARGE, 'Test User'),
    ).rejects.toThrow(LockerNotAvailableException);
  });

  it('should not send notification when delivery fails', async () => {
    lockerRepository.findAll.mockReturnValue([]);
    allocationStrategy.allocate.mockReturnValue(undefined);

    try {
      await service.deliver(LockerSize.LARGE, 'Test User');
    } catch {
      // expected
    }

    expect(notificationService.sendPickupNotification).not.toHaveBeenCalled();
  });

  it('should only consider available lockers', async () => {
    const occupiedLocker = new Locker(
      'L-001',
      LockerSize.SMALL,
      defaultLocation,
    );
    occupiedLocker.occupy();
    const availableLocker = new Locker(
      'L-002',
      LockerSize.MEDIUM,
      defaultLocation,
    );

    lockerRepository.findAll.mockReturnValue([occupiedLocker, availableLocker]);
    allocationStrategy.allocate.mockReturnValue(availableLocker);
    pickupCodeService.generate.mockReturnValue('TEST01');
    packageRepository.save.mockImplementation((pkg) => pkg);

    await service.deliver(LockerSize.SMALL, 'Test');

    expect(allocationStrategy.allocate).toHaveBeenCalledWith(LockerSize.SMALL, [
      availableLocker,
    ]);
  });

  describe('concurrency', () => {
    it('should not assign the same locker to two concurrent requests', async () => {
      const locker1 = new Locker('L-001', LockerSize.SMALL, defaultLocation);
      const locker2 = new Locker('L-002', LockerSize.SMALL, defaultLocation);
      let callCount = 0;

      // Simulate: first call sees both available, second call only sees L-002
      lockerRepository.findAll.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return [locker1, locker2];
        }
        // After first allocation marks L-001 as occupied
        return [locker1, locker2]; // Repository returns all, filter happens in service
      });

      // Strategy picks first available each time
      allocationStrategy.allocate.mockImplementation((_size, available) => {
        return available[0];
      });

      lockerRepository.updateStatus.mockImplementation((id) => {
        // Simulate the locker becoming occupied
        if (id === 'L-001') locker1.occupy();
        if (id === 'L-002') locker2.occupy();
        return undefined;
      });

      pickupCodeService.generate
        .mockReturnValueOnce('CODE01')
        .mockReturnValueOnce('CODE02');
      packageRepository.save.mockImplementation((pkg) => pkg);

      // Fire two concurrent requests
      const [result1, result2] = await Promise.all([
        service.deliver(LockerSize.SMALL, 'Agent1'),
        service.deliver(LockerSize.SMALL, 'Agent2'),
      ]);

      // They must get different lockers
      expect(result1.lockerId).not.toBe(result2.lockerId);
    });

    it('should reject excess concurrent requests when lockers are limited', async () => {
      const singleLocker = new Locker(
        'L-001',
        LockerSize.SMALL,
        defaultLocation,
      );

      lockerRepository.findAll.mockImplementation(() => [singleLocker]);
      allocationStrategy.allocate.mockImplementation((_size, available) => {
        return available.find((l) => l.isAvailable);
      });
      lockerRepository.updateStatus.mockImplementation(() => {
        singleLocker.occupy();
        return undefined;
      });
      pickupCodeService.generate.mockReturnValue('CODE01');
      packageRepository.save.mockImplementation((pkg) => pkg);

      // Fire 3 concurrent requests but only 1 locker available
      const results = await Promise.allSettled([
        service.deliver(LockerSize.SMALL, 'Agent1'),
        service.deliver(LockerSize.SMALL, 'Agent2'),
        service.deliver(LockerSize.SMALL, 'Agent3'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(2);

      rejected.forEach((r) => {
        expect(r.reason).toBeInstanceOf(LockerNotAvailableException);
      });
    });
  });
});
