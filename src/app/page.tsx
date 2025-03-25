// src/app/page.tsx
'use client'; // Adicione isso no topo do arquivo, pois usaremos hooks do React

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a página de login
    router.push('/login');
  }, [router]);

  return null; // Não renderiza nada, pois o redirecionamento é imediato
}