/**
 * Парсинг пользовательского запроса из текста команды или свободного сообщения.
 */
export function extractSearchQuery(text: string, command?: string): string {
  const trimmed = text.trim();
  if (command) {
    const re = new RegExp(`^/${command}\\s*`, "i");
    return trimmed.replace(re, "").trim();
  }
  return trimmed;
}

/** Команда с аргументом: /subscribe "искусственный интеллект" */
export function parseCommandArgs(text: string): { cmd: string; args: string } | null {
  const m = text.match(/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/s);
  if (!m) return null;
  return { cmd: m[1].toLowerCase(), args: (m[2] ?? "").trim() };
}
