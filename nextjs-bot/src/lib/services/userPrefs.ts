import { getConfig, hasRedis } from "../config";
import { redis, KEY } from "../db";
import type { UserPrefs } from "../types";

function defaults(): UserPrefs {
  return {
    hoursBack: getConfig().DEFAULT_HOURS_BACK,
    showSourceStats: true,
  };
}

export async function getUserPrefs(userId: string): Promise<UserPrefs> {
  if (!hasRedis()) return defaults();
  const stored = await redis.get<Partial<UserPrefs>>(KEY.prefs(userId));
  return { ...defaults(), ...stored };
}

export async function setUserPrefs(
  userId: string,
  patch: Partial<UserPrefs>
): Promise<UserPrefs> {
  const next = { ...(await getUserPrefs(userId)), ...patch };
  if (!hasRedis()) return next;
  await redis.set(KEY.prefs(userId), next);
  return next;
}
