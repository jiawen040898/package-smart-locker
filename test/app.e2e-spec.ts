import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface LockerResponse {
  id: string;
  size: string;
  location: string;
  status: string;
}

interface DeliveryResponse {
  packageId: string;
  lockerId: string;
  lockerSize: string;
  lockerLocation: string;
  pickupCode: string;
  recipientName: string;
  storedAt: string;
  expiresAt: string;
}

interface RetrievalCheckResponse {
  packageId: string;
  lockerId: string;
  recipientName: string;
  storedAt: string;
  storageCharge: StorageChargeResponse;
  message: string;
}

interface RetrievalConfirmResponse {
  packageId: string;
  lockerId: string;
  recipientName: string;
  retrievedAt: string;
  storageCharge: StorageChargeResponse;
  payment: PaymentResponse;
  message: string;
}

interface StorageChargeResponse {
  totalCharge: number;
  currency: string;
  daysStored: number;
  breakdown: {
    tier: string;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }[];
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
}

describe('Smart Package Locker System (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  describe('GET /lockers', () => {
    it('should return seeded lockers with location', () => {
      return request(server())
        .get('/lockers')
        .expect(200)
        .expect((res: { body: LockerResponse[] }) => {
          expect(res.body).toHaveLength(7);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('size');
          expect(res.body[0]).toHaveProperty('location');
          expect(res.body[0]).toHaveProperty('status');
        });
    });
  });

  describe('POST /lockers', () => {
    it('should create a new locker with location', () => {
      return request(server())
        .post('/lockers')
        .send({ size: 'SMALL', location: 'Building C, Basement' })
        .expect(201)
        .expect((res: { body: LockerResponse }) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.size).toBe('SMALL');
          expect(res.body.location).toBe('Building C, Basement');
          expect(res.body.status).toBe('AVAILABLE');
        });
    });

    it('should reject invalid locker size', () => {
      return request(server())
        .post('/lockers')
        .send({ size: 'EXTRA_LARGE', location: 'Test' })
        .expect(400);
    });

    it('should reject missing location', () => {
      return request(server())
        .post('/lockers')
        .send({ id: 'L-100', size: 'SMALL' })
        .expect(400);
    });
  });

  describe('POST /packages/deliver', () => {
    it('should deliver a package and return pickup details with location and expiry', () => {
      return request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Alice' })
        .expect(201)
        .expect((res: { body: DeliveryResponse }) => {
          expect(res.body.packageId).toBeDefined();
          expect(res.body.lockerId).toBeDefined();
          expect(res.body.lockerLocation).toBeDefined();
          expect(res.body.pickupCode).toHaveLength(6);
          expect(res.body.recipientName).toBe('Alice');
          expect(res.body.lockerSize).toBe('SMALL');
          expect(res.body.expiresAt).toBeDefined();
        });
    });

    it('should assign the smallest available locker', async () => {
      const res = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Bob' })
        .expect(201);

      expect((res.body as DeliveryResponse).lockerSize).toBe('SMALL');
    });

    it('should assign a larger locker when smaller ones are full', async () => {
      // Fill all 3 small lockers
      await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User1' });
      await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User2' });
      await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User3' });

      const res = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User4' })
        .expect(201);

      expect((res.body as DeliveryResponse).lockerSize).toBe('MEDIUM');
    });

    it('should return 409 when no suitable locker is available', async () => {
      for (let i = 0; i < 7; i++) {
        await request(server())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `User${i}` });
      }

      return request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Overflow' })
        .expect(409);
    });

    it('should reject requests with missing fields', () => {
      return request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL' })
        .expect(400);
    });

    it('should reject requests with invalid package size', () => {
      return request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'TINY', recipientName: 'Test' })
        .expect(400);
    });
  });

  describe('POST /packages/retrieve/check', () => {
    it('should return storage charge without releasing the package', async () => {
      const deliverRes = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'MEDIUM', recipientName: 'Charlie' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body as DeliveryResponse;

      const checkRes = await request(server())
        .post('/packages/retrieve/check')
        .send({ lockerId, pickupCode })
        .expect(201);

      const body = checkRes.body as RetrievalCheckResponse;
      expect(body.recipientName).toBe('Charlie');
      expect(body.storageCharge).toBeDefined();
      expect(body.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);
      expect(body.storageCharge.daysStored).toBeGreaterThanOrEqual(1);
      expect(body.storageCharge.currency).toBe('MYR');
      expect(body.storageCharge.breakdown).toBeInstanceOf(Array);
      expect(body.message).toContain('Storage charge');
    });

    it('should not release the locker during check', async () => {
      const deliverRes = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Dave' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body as DeliveryResponse;

      await request(server())
        .post('/packages/retrieve/check')
        .send({ lockerId, pickupCode })
        .expect(201);

      const lockersRes = await request(server()).get('/lockers').expect(200);

      const lockers = lockersRes.body as LockerResponse[];
      const locker = lockers.find((l) => l.id === lockerId);
      expect(locker!.status).toBe('OCCUPIED');
    });

    it('should return 404 for non-existent locker', () => {
      return request(server())
        .post('/packages/retrieve/check')
        .send({ lockerId: 'FAKE-LOCKER', pickupCode: 'ABC123' })
        .expect(404);
    });

    it('should return 401 for wrong pickup code', async () => {
      const deliverRes = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'LARGE', recipientName: 'Eve' })
        .expect(201);

      const { lockerId } = deliverRes.body as DeliveryResponse;

      return request(server())
        .post('/packages/retrieve/check')
        .send({ lockerId, pickupCode: 'WRONG1' })
        .expect(401);
    });
  });

  describe('POST /packages/retrieve/confirm', () => {
    it('should release the package and return final storage charge', async () => {
      const deliverRes = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'MEDIUM', recipientName: 'Frank' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body as DeliveryResponse;

      const confirmRes = await request(server())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(201);

      const body = confirmRes.body as RetrievalConfirmResponse;
      expect(body.recipientName).toBe('Frank');
      expect(body.retrievedAt).toBeDefined();
      expect(body.storageCharge).toBeDefined();
      expect(body.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);
      expect(body.payment).toBeDefined();
      expect(body.payment.success).toBe(true);
      expect(body.payment.transactionId).toBeDefined();
      expect(body.message).toContain('Payment');
    });

    it('should make the locker available after confirmation', async () => {
      const deliverRes = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Grace' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body as DeliveryResponse;

      await request(server())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(201);

      const lockersRes = await request(server()).get('/lockers').expect(200);

      const lockers = lockersRes.body as LockerResponse[];
      const locker = lockers.find((l) => l.id === lockerId);
      expect(locker!.status).toBe('AVAILABLE');
    });

    it('should not allow double retrieval', async () => {
      const deliverRes = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Hank' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body as DeliveryResponse;

      await request(server())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(201);

      return request(server())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(401);
    });

    it('should return 401 for wrong pickup code', async () => {
      const deliverRes = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'LARGE', recipientName: 'Ivy' })
        .expect(201);

      const { lockerId } = deliverRes.body as DeliveryResponse;

      return request(server())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode: 'WRONG1' })
        .expect(401);
    });
  });

  describe('Full workflow: check → confirm', () => {
    it('should handle a complete two-step retrieval flow', async () => {
      // 1. Delivery agent stores a package
      const delivery = await request(server())
        .post('/packages/deliver')
        .send({ packageSize: 'MEDIUM', recipientName: 'Zara' })
        .expect(201);

      const deliveryBody = delivery.body as DeliveryResponse;
      expect(deliveryBody.pickupCode).toHaveLength(6);
      expect(deliveryBody.lockerLocation).toBeDefined();

      // 2. Customer checks the charge (locker stays locked)
      const check = await request(server())
        .post('/packages/retrieve/check')
        .send({
          lockerId: deliveryBody.lockerId,
          pickupCode: deliveryBody.pickupCode,
        })
        .expect(201);

      const checkBody = check.body as RetrievalCheckResponse;
      expect(checkBody.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);
      expect(checkBody.storageCharge.daysStored).toBe(1);

      // 3. Verify locker is still occupied
      const midCheck = await request(server()).get('/lockers').expect(200);
      const midLockers = midCheck.body as LockerResponse[];
      const stillOccupied = midLockers.find(
        (l) => l.id === deliveryBody.lockerId,
      );
      expect(stillOccupied!.status).toBe('OCCUPIED');

      // 4. Customer confirms payment → locker opens
      const confirm = await request(server())
        .post('/packages/retrieve/confirm')
        .send({
          lockerId: deliveryBody.lockerId,
          pickupCode: deliveryBody.pickupCode,
        })
        .expect(201);

      const confirmBody = confirm.body as RetrievalConfirmResponse;
      expect(confirmBody.recipientName).toBe('Zara');
      expect(confirmBody.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);

      // 5. Verify locker is now available
      const afterConfirm = await request(server()).get('/lockers').expect(200);
      const afterLockers = afterConfirm.body as LockerResponse[];
      const released = afterLockers.find((l) => l.id === deliveryBody.lockerId);
      expect(released!.status).toBe('AVAILABLE');
    });
  });

  describe('Concurrent delivery requests', () => {
    it('should never assign the same locker to two packages', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        request(server())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `Agent${i}` }),
      );

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.status === 201);

      expect(successes).toHaveLength(3);

      const lockerIds = successes.map(
        (r) => (r.body as DeliveryResponse).lockerId,
      );
      const uniqueLockerIds = new Set(lockerIds);
      expect(uniqueLockerIds.size).toBe(3);
    });

    it('should reject excess requests when all lockers are full', async () => {
      for (let i = 0; i < 6; i++) {
        await request(server())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `Fill-${i}` })
          .expect(201);
      }

      const batch = Array.from({ length: 3 }, (_, i) =>
        request(server())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `Race-${i}` }),
      );

      const results = await Promise.all(batch);
      const successes = results.filter((r) => r.status === 201);
      const failures = results.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(2);
    });
  });
});
