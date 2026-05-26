import { redis, KEY, TTL } from "../db";

export type PendingAction = "search" | "subscribe";

export async function setPending(userId: string, action: PendingAction): Promise<void> {
  await redis.set(KEY.pending(userId), action, { ex: TTL.pending });
}

export async function getPending(userId: string): Promise<PendingAction | null> {
  const v = await redis.get<PendingAction>(KEY.pending(userId));
  return v ?? null;
}

export async function clearPending(userId: string): Promise<void> {
  await redis.del(KEY.pending(userId));
}
