import { getConfig } from "./config";
import { redis, KEY, TTL } from "./db";

/**
 * Скользящее окно: N запросов в минуту на пользователя.
 * @returns true если запрос разрешён.
 */
export async function checkRateLimit(userId: string, limit?: number): Promise<boolean> {
  const max = limit ?? getConfig().RATE_LIMIT_PER_MIN;
  const key = KEY.rate(userId);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, TTL.rate);
  return count <= max;
}

/** Идемпотентность по update_id. true если впервые обрабатываем. */
export async function markUpdateOnce(updateId: string | number): Promise<boolean> {
  const set = await redis.set(KEY.update(updateId), "1", {
    nx: true,
    ex: TTL.update,
  });
  return set === "OK";
}
