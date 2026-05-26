import { redis, KEY } from "../db";
import type { Subscription } from "../types";

export async function addSubscription(sub: Subscription): Promise<void> {
  await redis.set(KEY.sub(sub.userId, sub.query), sub);
}

export async function removeSubscription(userId: string, query: string): Promise<void> {
  await redis.del(KEY.sub(userId, query));
}

export async function listUserSubscriptions(userId: string): Promise<Subscription[]> {
  const keys: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, batch] = (await redis.scan(cursor, {
      match: KEY.subUserScan(userId),
      count: 100,
    })) as [string, string[]];
    keys.push(...batch);
    cursor = next;
  } while (String(cursor) !== "0");

  if (!keys.length) return [];
  const subs = await Promise.all(keys.map((k) => redis.get<Subscription>(k)));
  return subs.filter(Boolean) as Subscription[];
}

export async function listAllSubscriptions(): Promise<Subscription[]> {
  const keys: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, batch] = (await redis.scan(cursor, {
      match: KEY.subScan(),
      count: 200,
    })) as [string, string[]];
    keys.push(...batch);
    cursor = next;
  } while (String(cursor) !== "0");

  const subs = await Promise.all(keys.map((k) => redis.get<Subscription>(k)));
  return subs.filter(Boolean) as Subscription[];
}
