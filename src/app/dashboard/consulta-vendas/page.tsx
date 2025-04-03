'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { formatarMoeda } from '@/utils/moeda';
import { FiSearch, FiFileText, FiUser, FiCalendar, FiDollarSign, FiArrowRight, FiTruck, FiHome } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';
import { OrderStatus } from '@/lib/orderStatus';
import { OrderBadge } from '../../../../components/OrderBadge';

interface Sale {
  id: string;
  created_at: string;
  sale_type: 'pickup' | 'delivery';
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix';
  subtotal: number;
  total: number;
  status: string;
  notes: string;
  delivery_info?: {
    customer_name: string;
    customer_phone: string;
    delivery_date: string;
    delivery_time: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
  };
}

export default function ConsultaVendasPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
  
    try {
      if (!searchTerm) {
        const { data, error } = await supabase
          .from('sales')
          .select('*, delivery_infos (*)')
          .order('created_at', { ascending: false })
          .limit(20);
  
        if (error) throw error;
        setSales(data?.map(s => ({ ...s, delivery_info: s.delivery_infos?.[0] || null })) || []);
        return;
      }
  
      // Consulta que simula LEFT JOIN com OR conditions
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .or(`sale_id.ilike.%${searchTerm}%`);
  
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('delivery_infos')
        .select('*, sales!inner(*)')
        .or(`customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`);
  
      if (salesError || deliveryError) throw salesError || deliveryError;
  
      // Combinar resultados e remover duplicatas
      const salesFromDelivery = deliveryData?.map(d => ({ ...d.sales, delivery_info: d })) || [];
      const allSales = [...(salesData || []), ...salesFromDelivery];
      
      const uniqueSales = Array.from(new Map(
        allSales.map(s => [s.id, s])
      ).values());
  
      setSales(uniqueSales.slice(0, 20)); // Limitar a 20 resultados
  
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      setError('Erro ao buscar vendas. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [searchTerm]);

  // Função para formatar a data de entrega
  const formatDeliveryDate = (sale: Sale) => {
    if (sale.sale_type === 'pickup') return 'Retirada';
    
    if (sale.delivery_info?.delivery_date && sale.delivery_info?.delivery_time) {
      // Extrai manualmente as partes da data ISO (YYYY-MM-DD)
      const [year, month, day] = sale.delivery_info.delivery_date.split('T')[0].split('-');
      const formattedDate = `${day}/${month}/${year}`;
      
      // Extrai horas e minutos (HH:MM:SS -> HH:MM)
      const formattedTime = sale.delivery_info.delivery_time.substring(0, 5);
      
      return `Entrega - ${formattedDate} - ${formattedTime}`;
    }
    
    return 'Entrega - Data não especificada';
  };

  // Função para extrair o número do pedido (usando o ID encurtado)
  const extractOrderNumber = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  // Função para traduzir o método de pagamento
  const translatePaymentMethod = (method: string) => {
    switch(method) {
      case 'cash': return 'Dinheiro';
      case 'credit_card': return 'Cartão Crédito';
      case 'debit_card': return 'Cartão Débito';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  // Navegação para detalhes da venda
  const viewSaleDetails = (saleId: string) => {
    router.push(`/dashboard/vendas/detalhes/${saleId}`);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Consulta de Vendas</h1>

        {/* Exibir mensagem de erro se houver */}
        {error && (
          <div className="mb-4 p-4 bg-red-900 text-red-100 rounded-lg">
            {error}
          </div>
        )}
        {/* Filtros de pesquisa */}
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                Pesquisar vendas
                </label>
                <div className="relative">
                <input
                    type="text"
                    placeholder="N° pedido, nome ou telefone do cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
                />
                <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
                </div>
            </div>
        </div>
 

        {/* Resultados */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <ClipLoader color="#ffffff" size={40} />
            </div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma venda encontrada
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {sales.map((sale) => (
                <div 
                  key={sale.id} 
                  className="p-4 hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => viewSaleDetails(sale.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FiFileText className="text-blue-400" />
                        <span className="font-medium">#{extractOrderNumber(sale.id)}</span>
                        <OrderBadge status={OrderStatus[sale.status as keyof typeof OrderStatus]} />
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        {sale.sale_type === 'delivery' ? <FiTruck /> : <FiHome />}
                        <span>{formatDeliveryDate(sale)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <FiUser />
                        <span>
                          {sale.delivery_info?.customer_name} - {sale.delivery_info?.customer_phone}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 text-sm text-gray-400 mb-1">
                        <FiCalendar />
                        <span>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-lg font-bold text-blue-400">
                        <FiDollarSign />
                        <span>{formatarMoeda(sale.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{translatePaymentMethod(sale.payment_method)}</span>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        viewSaleDetails(sale.id);
                      }}
                      className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                    >
                      Ver detalhes <FiArrowRight />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão de Voltar */}
        <button
          onClick={() => router.push('/dashboard')}
          className="fixed bottom-6 left-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}