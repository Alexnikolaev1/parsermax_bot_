import { redis, KEY } from "../db";
import { getConfig } from "../config";
import type { UserPrefs } from "../types";

function defaults(): UserPrefs {
  return {
    hoursBack: getConfig().DEFAULT_HOURS_BACK,
    showSourceStats: true,
  };
}

export async function getUserPrefs(userId: string): Promise<UserPrefs> {
  const stored = await redis.get<Partial<UserPrefs>>(KEY.prefs(userId));
  return { ...defaults(), ...stored };
}

export async function setUserPrefs(
  userId: string,
  patch: Partial<UserPrefs>
): Promise<UserPrefs> {
  const next = { ...(await getUserPrefs(userId)), ...patch };
  await redis.set(KEY.prefs(userId), next);
  return next;
}
