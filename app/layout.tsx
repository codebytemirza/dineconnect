import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RestaurantProvider } from '@/context/restaurant-context';
import { AppShell } from '@/components/app-shell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'DineConnect — AI WhatsApp Restaurant Ordering Platform',
  description: 'Production Multi-Tenant WhatsApp Restaurant Order Automation, Menu, and Analytics',
  icons: {
    icon: '/logo-dineconnect.png',
    apple: '/logo-dineconnect.png',
    shortcut: '/logo-dineconnect.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full w-full bg-[#f7f5f0] text-[#12211d]" suppressHydrationWarning>
        <RestaurantProvider>
          <AppShell>{children}</AppShell>
        </RestaurantProvider>
      </body>
    </html>
  );
}
