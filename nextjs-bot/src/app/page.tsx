export default function Page() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 720 }}>
      <h1>MAX News Bot</h1>
      <p>Сервис работает. Webhook: <code>/api/bot/webhook</code></p>
      <p>
        Health: <a href="/api/cron/health">/api/cron/health</a>
      </p>
      <p>
        Тестовый поиск:{" "}
        <a href="/api/search/instant?q=test&hours=6">/api/search/instant?q=test</a>
      </p>
    </main>
  );
}
