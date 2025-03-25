// src/app/dashboard/layout.tsx
'use client';
import { useLoading } from '@/contexts/loading-context';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setLoading } = useLoading();
  const pathname = usePathname();

  useEffect(() => {
    // Desativa o loading quando a rota muda
    setLoading(false);
  }, [pathname, setLoading]);

  return <>{children}</>;
}