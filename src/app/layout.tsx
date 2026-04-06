import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daily Alchemy - 空の祭壇',
  description: '日々の実践を静かに捧げる場',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
