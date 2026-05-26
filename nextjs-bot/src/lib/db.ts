import { Redis } from "@upstash/redis";

/**
 * Единственный экземпляр Upstash REST-клиента.
 * REST-протокол избавляет serverless-функции от утечек коннектов.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Ключи Redis. Все префиксы здесь, чтобы не разъезжались. */
export const KEY = {
  rate: (userId: string) => `rate:${userId}`,
  update: (id: string | number) => `upd:${id}`,
  cache: (q: string, hoursBack = 6) =>
    `cache:${q.toLowerCase()}:${hoursBack}`,
  sub: (userId: string, q: string) =>
    `sub:${userId}:${Buffer.from(q.toLowerCase()).toString("base64url")}`,
  subUserScan: (userId: string) => `sub:${userId}:*`,
  subScan: () => "sub:*",
  seen: (userId: string, urlHash: string) => `seen:${userId}:${urlHash}`,
  breaker: (source: string) => `breaker:${source}`,
  prefs: (userId: string) => `prefs:${userId}`,
  pending: (userId: string) => `pending:${userId}`,
  lastQuery: (userId: string) => `lastq:${userId}`,
};

/** TTL в секундах. */
export const TTL = {
  rate: 60,
  update: 60 * 60 * 24,
  cache: 60 * 5,
  seen: 60 * 60 * 24,
  breaker: 60 * 10,
  pending: 60 * 10,
  lastQuery: 60 * 60 * 24,
};
