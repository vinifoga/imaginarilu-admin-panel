// src/app/layout.tsx
'use client'
import './globals.css';
import { useEffect } from 'react';
import { LoadingProvider } from '@/contexts/loading-context';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.remove('vsc-initialized');
  }, []);

  return (
    <html lang="en" suppressHydrationWarning> 
      <body className="bg-gradient-custom text-text" suppressHydrationWarning>
        <LoadingProvider>
          <LoadingOverlay />
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}
