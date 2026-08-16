import { Mutex } from './mutex';

describe('Mutex', () => {
  let mutex: Mutex;

  beforeEach(() => {
    mutex = new Mutex();
  });

  it('should allow immediate acquisition when unlocked', async () => {
    await mutex.acquire(); // Should not hang
    mutex.release();
  });

  it('should serialize concurrent access', async () => {
    const order: number[] = [];

    await mutex.acquire();

    // These will queue up
    const p1 = mutex.acquire().then(() => {
      order.push(1);
      mutex.release();
    });

    const p2 = mutex.acquire().then(() => {
      order.push(2);
      mutex.release();
    });

    // Release the initial lock to let queued acquires proceed
    mutex.release();
    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
  });

  it('should ensure only one holder at a time', async () => {
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const task = async () => {
      await mutex.acquire();
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCount--;
      mutex.release();
    };

    await Promise.all([task(), task(), task(), task(), task()]);

    expect(maxConcurrent).toBe(1);
  });

  it('should handle rapid acquire/release cycles', async () => {
    for (let i = 0; i < 100; i++) {
      await mutex.acquire();
      mutex.release();
    }
    // Should not deadlock or throw
  });
});
