/**
 * Lightweight in-memory TTL cache.
 *
 * Designed for small, frequently-read datasets like project-access lookups.
 * NOT a replacement for Redis — suitable for single-process deployments.
 *
 * Usage:
 *   const cache = new TTLCache({ ttlMs: 5 * 60 * 1000, maxSize: 2000 });
 *   cache.set('key', value);
 *   cache.get('key');         // returns value or undefined
 *   cache.del('key');         // explicit invalidation
 *   cache.clear();            // flush everything
 */

class TTLCache {
  /**
   * @param {object} opts
   * @param {number} opts.ttlMs   – time-to-live in milliseconds (default 5 min)
   * @param {number} opts.maxSize – max number of entries before LRU eviction (default 2000)
   */
  constructor({ ttlMs = 5 * 60 * 1000, maxSize = 2000 } = {}) {
    this._ttlMs = ttlMs;
    this._maxSize = maxSize;
    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this._store = new Map();

    // Periodic sweep every ttlMs to avoid unbounded memory growth
    this._sweepInterval = setInterval(() => this._sweep(), this._ttlMs).unref();
  }

  /**
   * Retrieve a cached value. Returns `undefined` on miss / expiry.
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }

    // Move to end for LRU ordering (Map preserves insertion order)
    this._store.delete(key);
    this._store.set(key, entry);

    return entry.value;
  }

  /**
   * Store a value with automatic expiry.
   */
  set(key, value) {
    // Evict oldest if at capacity
    if (this._store.size >= this._maxSize) {
      const oldest = this._store.keys().next().value;
      this._store.delete(oldest);
    }

    this._store.set(key, {
      value,
      expiresAt: Date.now() + this._ttlMs,
    });
  }

  /**
   * Explicitly invalidate a key.
   */
  del(key) {
    this._store.delete(key);
  }

  /**
   * Invalidate all entries matching a predicate on the key.
   * Useful for bulk invalidation (e.g. all keys for a project).
   */
  delBy(predicate) {
    for (const key of this._store.keys()) {
      if (predicate(key)) {
        this._store.delete(key);
      }
    }
  }

  /**
   * Flush the entire cache.
   */
  clear() {
    this._store.clear();
  }

  /** @returns {number} current entry count */
  get size() {
    return this._store.size;
  }

  /** Remove expired entries. */
  _sweep() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) {
        this._store.delete(key);
      }
    }
  }

  /** Stop the sweep timer (for graceful shutdown). */
  destroy() {
    clearInterval(this._sweepInterval);
    this._store.clear();
  }
}

module.exports = { TTLCache };
