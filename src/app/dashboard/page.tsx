// src/app/dashboard/page.tsx
'use client';

import { supabase } from '@/lib/supabaseCliente';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FiShoppingCart, FiList, FiPackage, FiDollarSign, FiLogOut, FiSearch, FiFileText, FiClock } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';

export default function DashboardPage() {
  const router = useRouter();
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  
  // Função reutilizável para navegação
  const handleNavigation = (path: string) => {
    setActiveButton(path);
    router.push(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Busca pedidos pendentes
  useEffect(() => {
    const fetchPendingOrders = async () => {
      const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact' })
        .eq('status', 'PENDING');

      if (!error && count) {
        setPendingOrdersCount(count);
      }
    };

    fetchPendingOrders();

    // Configura realtime para atualizações
    const channel = supabase
      .channel('sales_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchPendingOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    {
      path: '/dashboard/pedidos-pendentes',
      icon: <FiClock className="text-lg" />,
      label: 'Pedidos Pendentes',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="space-y-4">
          {/* Botões de navegação */}
          {buttons.map((button) => (
            <button
              key={button.path}
              onClick={() => handleNavigation(button.path)}
              disabled={activeButton === button.path}
              className={`w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-wait transition-all relative ${
                button.badge ? 'pr-8' : ''
              }`}
            >
              {activeButton === button.path ? (
                <ClipLoader color="#ffffff" size={20} />
              ) : (
                <>
                  {button.icon}
                  {button.label}
                  {button.badge && (
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {button.badge}
                    </span>
                  )}
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
              <FiLogOut className="text-lg" />
            )}                    
          </button>
        </div>
      </div>
    </div>
  );
}