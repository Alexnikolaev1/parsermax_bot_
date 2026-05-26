export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

export const metadata = {
  title: "MAX News Bot",
  description: "AI-powered news monitor for MAX messenger",
};
