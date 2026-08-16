/**
 * A simple in-process mutex for serializing access to critical sections.
 *
 * In a single-process Node.js app, async operations can interleave
 * between await points. This mutex ensures that concurrent requests
 * are queued and processed one at a time for the protected resource.
 *
 * For a distributed system (multiple instances), replace with a
 * distributed lock (e.g., Redis SETNX, PostgreSQL advisory locks).
 */
export class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}
