// src/app/dashboard/page.tsx
'use client';

import { supabase } from '@/lib/supabaseCliente';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiShoppingCart, FiList, FiPackage, FiDollarSign, FiLogOut, FiSearch, FiFileText } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';

export default function DashboardPage() {
  const router = useRouter();
  const [activeButton, setActiveButton] = useState<string | null>(null);
  
  // Função reutilizável para navegação
  const handleNavigation = (path: string) => {
    setActiveButton(path);
    router.push(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Configuração dos botões
  const buttons = [
    {
      path: '/dashboard/consulta-preco',
      icon: <FiSearch className="text-lg" />,
      label: 'Consulta de Preço'
    },
    {
      path: '/dashboard/vendas',
      icon: <FiShoppingCart className="text-lg" />,
      label: 'Vender'
    },
    {
      path: '/dashboard/categorias',
      icon: <FiList className="text-lg" />,
      label: 'Categorias'
    },
    {
      path: '/dashboard/produtos',
      icon: <FiPackage className="text-lg" />,
      label: 'Produtos'
    },
    {
      path: '/dashboard/simulacao',
      icon: <FiDollarSign className="text-lg" />,
      label: 'Simulação de preço'
    },
    {
      path: '/dashboard/consulta-vendas',
      icon: <FiFileText className="text-lg" />,
      label: 'Consulta de Vendas'
    },
  ];

  return (
        <div className="min-h-screen flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

            <div className="space-y-4">
              {/* Botões de navegação */}
              {buttons.map((button) => (
                <button
                  key={button.path}
                  onClick={() => handleNavigation(button.path)}
                  disabled={activeButton === button.path}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-wait transition-all"
                >
                  {activeButton === button.path ? (
                    <ClipLoader color="#ffffff" size={20} />
                  ) : (
                    <>
                      {button.icon}
                      {button.label}
                    </>
                  )}
                </button>
              ))}
              {/* Botão de Logout (separado por ser diferente) */}
              <button
                onClick={handleLogout}
                disabled={activeButton === 'logout'}
                className="fixed bottom-6 right-6 bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-600"
              >
              {activeButton === 'logout' ? (
                  <ClipLoader color="#ffffff" size={20} />
                ) : (
                  <>
                    <FiLogOut className="text-lg" />
                  </>
            )}                    
            </button>
        </div>
      </div>
    </div>
  );
}