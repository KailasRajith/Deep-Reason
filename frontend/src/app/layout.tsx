import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from '@/components/layout/client-layout';

export const metadata: Metadata = {
  title: 'Deep Reason — Autonomous AI Reasoning',
  description:
    'A world-class multi-model AI reasoning platform using Monte Carlo Tree Search for System-2 deliberation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
