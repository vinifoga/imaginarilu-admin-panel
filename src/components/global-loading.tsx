// src/components/global-loading.tsx
'use client';

import { ClipLoader } from 'react-spinners';
import { useLoading } from '@/contexts/loading-context';

export function GlobalLoading() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <ClipLoader color="#3b82f6" size={50} />
    </div>
  );
}