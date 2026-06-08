import { hasRedis } from "../config";
import { redis, KEY, TTL } from "../db";

export async function saveLastQuery(userId: string, query: string): Promise<void> {
  if (!hasRedis()) return;
  await redis.set(KEY.lastQuery(userId), query, { ex: TTL.lastQuery });
}

export async function getLastQuery(userId: string): Promise<string | null> {
  if (!hasRedis()) return null;
  const q = await redis.get<string>(KEY.lastQuery(userId));
  return q ?? null;
}
