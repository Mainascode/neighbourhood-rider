const memoryKv = new Map();
const memorySets = new Map();
const memoryHash = new Map();

let redisClientPromise = null;

async function getRedisClient() {
  if (redisClientPromise) return redisClientPromise;

  redisClientPromise = (async () => {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    try {
      const redisModule = await import("redis");
      const client = redisModule.createClient({ url });
      client.on("error", (err) => {
        console.error("[redis] client error:", err?.message || err);
      });
      await client.connect();
      return client;
    } catch (err) {
      console.warn("[redis] unavailable, using in-memory fallback:", err?.message || err);
      return null;
    }
  })();

  return redisClientPromise;
}

function memSetWithExpiry(key, value, exSeconds) {
  memoryKv.set(key, value);
  if (Number.isFinite(exSeconds) && exSeconds > 0) {
    setTimeout(() => memoryKv.delete(key), exSeconds * 1000);
  }
}

export async function redisSet(key, value, exSeconds = null) {
  const client = await getRedisClient();
  if (client) {
    if (Number.isFinite(exSeconds) && exSeconds > 0) {
      await client.set(key, value, { EX: exSeconds });
      return;
    }
    await client.set(key, value);
    return;
  }
  memSetWithExpiry(key, value, exSeconds);
}

export async function redisDel(key) {
  const client = await getRedisClient();
  if (client) {
    await client.del(key);
    return;
  }
  memoryKv.delete(key);
  memorySets.delete(key);
  memoryHash.delete(key);
}

export async function redisHSet(key, map) {
  const client = await getRedisClient();
  if (client) {
    await client.hSet(key, map);
    return;
  }
  const existing = memoryHash.get(key) || {};
  memoryHash.set(key, { ...existing, ...map });
}

export async function redisExpire(key, seconds) {
  const client = await getRedisClient();
  if (client) {
    await client.expire(key, seconds);
    return;
  }
  if (memoryKv.has(key)) {
    setTimeout(() => memoryKv.delete(key), seconds * 1000);
  }
  if (memoryHash.has(key)) {
    setTimeout(() => memoryHash.delete(key), seconds * 1000);
  }
}

export async function redisSAdd(key, value) {
  const client = await getRedisClient();
  if (client) {
    await client.sAdd(key, value);
    return;
  }
  const existing = memorySets.get(key) || new Set();
  existing.add(value);
  memorySets.set(key, existing);
}

export async function redisSRem(key, value) {
  const client = await getRedisClient();
  if (client) {
    await client.sRem(key, value);
    return;
  }
  const existing = memorySets.get(key);
  if (!existing) return;
  existing.delete(value);
  memorySets.set(key, existing);
}

export async function redisSCard(key) {
  const client = await getRedisClient();
  if (client) {
    return client.sCard(key);
  }
  const existing = memorySets.get(key);
  return existing ? existing.size : 0;
}

export async function redisSMembers(key) {
  const client = await getRedisClient();
  if (client) {
    return client.sMembers(key);
  }
  const existing = memorySets.get(key);
  return existing ? Array.from(existing) : [];
}

export async function redisAcquireLock(key, ttlSeconds = 600) {
  const client = await getRedisClient();
  if (client) {
    const result = await client.set(key, "1", { NX: true, EX: ttlSeconds });
    return result === "OK";
  }

  if (memoryKv.has(key)) return false;
  memSetWithExpiry(key, "1", ttlSeconds);
  return true;
}
