import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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

  describe('GET /lockers', () => {
    it('should return seeded lockers with location', () => {
      return request(app.getHttpServer())
        .get('/lockers')
        .expect(200)
        .expect((res) => {
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
      return request(app.getHttpServer())
        .post('/lockers')
        .send({ size: 'SMALL', location: 'Building C, Basement' })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.size).toBe('SMALL');
          expect(res.body.location).toBe('Building C, Basement');
          expect(res.body.status).toBe('AVAILABLE');
        });
    });

    it('should reject invalid locker size', () => {
      return request(app.getHttpServer())
        .post('/lockers')
        .send({ size: 'EXTRA_LARGE', location: 'Test' })
        .expect(400);
    });

    it('should reject missing location', () => {
      return request(app.getHttpServer())
        .post('/lockers')
        .send({ id: 'L-100', size: 'SMALL' })
        .expect(400);
    });
  });

  describe('POST /packages/deliver', () => {
    it('should deliver a package and return pickup details with location and expiry', () => {
      return request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Alice' })
        .expect(201)
        .expect((res) => {
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
      const res = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Bob' })
        .expect(201);

      expect(res.body.lockerSize).toBe('SMALL');
    });

    it('should assign a larger locker when smaller ones are full', async () => {
      // Fill all 3 small lockers
      await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User1' });
      await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User2' });
      await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User3' });

      const res = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'User4' })
        .expect(201);

      expect(res.body.lockerSize).toBe('MEDIUM');
    });

    it('should return 409 when no suitable locker is available', async () => {
      for (let i = 0; i < 7; i++) {
        await request(app.getHttpServer())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `User${i}` });
      }

      return request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Overflow' })
        .expect(409);
    });

    it('should reject requests with missing fields', () => {
      return request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL' })
        .expect(400);
    });

    it('should reject requests with invalid package size', () => {
      return request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'TINY', recipientName: 'Test' })
        .expect(400);
    });
  });

  describe('POST /packages/retrieve/check', () => {
    it('should return storage charge without releasing the package', async () => {
      const deliverRes = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'MEDIUM', recipientName: 'Charlie' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body;

      const checkRes = await request(app.getHttpServer())
        .post('/packages/retrieve/check')
        .send({ lockerId, pickupCode })
        .expect(201);

      expect(checkRes.body.recipientName).toBe('Charlie');
      expect(checkRes.body.storageCharge).toBeDefined();
      expect(checkRes.body.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);
      expect(checkRes.body.storageCharge.daysStored).toBeGreaterThanOrEqual(1);
      expect(checkRes.body.storageCharge.currency).toBe('MYR');
      expect(checkRes.body.storageCharge.breakdown).toBeInstanceOf(Array);
      expect(checkRes.body.message).toContain('Storage charge');
    });

    it('should not release the locker during check', async () => {
      const deliverRes = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Dave' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body;

      // Check but don't confirm
      await request(app.getHttpServer())
        .post('/packages/retrieve/check')
        .send({ lockerId, pickupCode })
        .expect(201);

      // Locker should still be occupied
      const lockersRes = await request(app.getHttpServer())
        .get('/lockers')
        .expect(200);

      const locker = lockersRes.body.find((l: any) => l.id === lockerId);
      expect(locker.status).toBe('OCCUPIED');
    });

    it('should return 404 for non-existent locker', () => {
      return request(app.getHttpServer())
        .post('/packages/retrieve/check')
        .send({ lockerId: 'FAKE-LOCKER', pickupCode: 'ABC123' })
        .expect(404);
    });

    it('should return 401 for wrong pickup code', async () => {
      const deliverRes = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'LARGE', recipientName: 'Eve' })
        .expect(201);

      return request(app.getHttpServer())
        .post('/packages/retrieve/check')
        .send({ lockerId: deliverRes.body.lockerId, pickupCode: 'WRONG1' })
        .expect(401);
    });
  });

  describe('POST /packages/retrieve/confirm', () => {
    it('should release the package and return final storage charge', async () => {
      const deliverRes = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'MEDIUM', recipientName: 'Frank' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body;

      const confirmRes = await request(app.getHttpServer())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(201);

      expect(confirmRes.body.recipientName).toBe('Frank');
      expect(confirmRes.body.retrievedAt).toBeDefined();
      expect(confirmRes.body.storageCharge).toBeDefined();
      expect(confirmRes.body.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);
      expect(confirmRes.body.payment).toBeDefined();
      expect(confirmRes.body.payment.success).toBe(true);
      expect(confirmRes.body.payment.transactionId).toBeDefined();
      expect(confirmRes.body.message).toContain('Payment');
    });

    it('should make the locker available after confirmation', async () => {
      const deliverRes = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Grace' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body;

      await request(app.getHttpServer())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(201);

      const lockersRes = await request(app.getHttpServer())
        .get('/lockers')
        .expect(200);

      const locker = lockersRes.body.find((l: any) => l.id === lockerId);
      expect(locker.status).toBe('AVAILABLE');
    });

    it('should not allow double retrieval', async () => {
      const deliverRes = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'SMALL', recipientName: 'Hank' })
        .expect(201);

      const { lockerId, pickupCode } = deliverRes.body;

      // First confirm succeeds
      await request(app.getHttpServer())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(201);

      // Second confirm fails
      return request(app.getHttpServer())
        .post('/packages/retrieve/confirm')
        .send({ lockerId, pickupCode })
        .expect(401);
    });

    it('should return 401 for wrong pickup code', async () => {
      const deliverRes = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'LARGE', recipientName: 'Ivy' })
        .expect(201);

      return request(app.getHttpServer())
        .post('/packages/retrieve/confirm')
        .send({ lockerId: deliverRes.body.lockerId, pickupCode: 'WRONG1' })
        .expect(401);
    });
  });

  describe('Full workflow: check → confirm', () => {
    it('should handle a complete two-step retrieval flow', async () => {
      // 1. Delivery agent stores a package
      const delivery = await request(app.getHttpServer())
        .post('/packages/deliver')
        .send({ packageSize: 'MEDIUM', recipientName: 'Zara' })
        .expect(201);

      expect(delivery.body.pickupCode).toHaveLength(6);
      expect(delivery.body.lockerLocation).toBeDefined();

      // 2. Customer checks the charge (locker stays locked)
      const check = await request(app.getHttpServer())
        .post('/packages/retrieve/check')
        .send({
          lockerId: delivery.body.lockerId,
          pickupCode: delivery.body.pickupCode,
        })
        .expect(201);

      expect(check.body.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);
      expect(check.body.storageCharge.daysStored).toBe(1); // Same day

      // 3. Verify locker is still occupied
      const midCheck = await request(app.getHttpServer())
        .get('/lockers')
        .expect(200);
      const stillOccupied = midCheck.body.find(
        (l: any) => l.id === delivery.body.lockerId,
      );
      expect(stillOccupied.status).toBe('OCCUPIED');

      // 4. Customer confirms payment → locker opens
      const confirm = await request(app.getHttpServer())
        .post('/packages/retrieve/confirm')
        .send({
          lockerId: delivery.body.lockerId,
          pickupCode: delivery.body.pickupCode,
        })
        .expect(201);

      expect(confirm.body.recipientName).toBe('Zara');
      expect(confirm.body.storageCharge.totalCharge).toBeGreaterThanOrEqual(0);

      // 5. Verify locker is now available
      const afterConfirm = await request(app.getHttpServer())
        .get('/lockers')
        .expect(200);
      const released = afterConfirm.body.find(
        (l: any) => l.id === delivery.body.lockerId,
      );
      expect(released.status).toBe('AVAILABLE');
    });
  });

  describe('Concurrent delivery requests', () => {
    it('should never assign the same locker to two packages', async () => {
      // Fire 3 concurrent requests
      const promises = Array.from({ length: 3 }, (_, i) =>
        request(app.getHttpServer())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `Agent${i}` }),
      );

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.status === 201);

      // All 3 should succeed (we have 7 lockers)
      expect(successes).toHaveLength(3);

      // All assigned lockerIds must be unique — proves no race condition
      const lockerIds = successes.map((r) => r.body.lockerId);
      const uniqueLockerIds = new Set(lockerIds);
      expect(uniqueLockerIds.size).toBe(3);
    });

    it('should reject excess requests when all lockers are full', async () => {
      // Fill 6 lockers sequentially (leaving only 1)
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `Fill-${i}` })
          .expect(201);
      }

      // Now fire 3 concurrent requests (only 1 locker left)
      const batch = Array.from({ length: 3 }, (_, i) =>
        request(app.getHttpServer())
          .post('/packages/deliver')
          .send({ packageSize: 'SMALL', recipientName: `Race-${i}` }),
      );

      const results = await Promise.all(batch);
      const successes = results.filter((r) => r.status === 201);
      const failures = results.filter((r) => r.status === 409);

      // Only 1 should succeed, 2 should fail
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(2);
    });
  });
});
