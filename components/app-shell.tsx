'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublicPage = pathname === '/' || pathname === '/login';
  const isAdminPage = pathname.startsWith('/admin');

  if (isPublicPage) {
    return (
      <div className="w-full min-h-screen overflow-y-auto bg-[#0a120f] text-white">
        {children}
      </div>
    );
  }

  if (isAdminPage) {
    return (
      <div className="w-full min-h-screen overflow-y-auto bg-[#0a1411] text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f7f5f0] text-[#12211d]">
      <Sidebar />
      <main className="flex-1 h-screen overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
