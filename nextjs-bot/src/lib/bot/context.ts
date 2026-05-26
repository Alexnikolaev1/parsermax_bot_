/** Контекст одного входящего сообщения MAX. */
export interface BotContext {
  userId: string;
  chatId: string;
  text: string;
}
