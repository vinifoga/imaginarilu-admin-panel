// src/app/dashboard/pedidos-pendentes/page.tsx
'use client';

import { supabase } from '@/lib/supabaseCliente';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiHome, FiPackage, FiTruck } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';
import LeftArrowIcon from '../../../../components/LeftArrowIcon';
import { OrderStatus, getStatusFromTranslation } from '@/lib/orderStatus';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Product {
  id: string;
  name: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_id: string;
  product: Product;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  total: number;
  status: string;
  sale_type: 'pickup' | 'delivery';
  items: OrderItem[];
  notes?: string;
}

export default function PendingOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Atualize a função fetchPendingOrders
    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
          // Primeiro, busque apenas os pedidos pendentes
          const { data: ordersData, error: ordersError } = await supabase
            .from('sales')
            .select('*')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true });
      
          if (ordersError) {
            console.error('Orders error:', ordersError);
            throw ordersError;
          }
      
          if (!ordersData || ordersData.length === 0) {
            setOrders([]);
            return;
          }
      
          // Depois, para cada pedido, busque os itens e produtos separadamente
          const ordersWithItems = await Promise.all(
            ordersData.map(async (order) => {
              // Busca os itens da venda
              const { data: itemsData, error: itemsError } = await supabase
                .from('sale_items')
                .select('*')
                .eq('sale_id', order.id);
      
              if (itemsError) {
                console.error(`Items error for order ${order.id}:`, itemsError);
                return { ...order, items: [] };
              }
      
              // Para cada item, busca o produto relacionado
              const itemsWithProducts = await Promise.all(
                (itemsData || []).map(async (item) => {
                  const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('id, name')
                    .eq('id', item.product_id)
                    .single();
      
                  if (productError) {
                    console.error(`Product error for item ${item.id}:`, productError);
                    return {
                      ...item,
                      product: { id: item.product_id, name: 'Produto não encontrado' }
                    };
                  }
      
                  return {
                    ...item,
                    product: productData
                  };
                })
              );
      
              return {
                ...order,
                items: itemsWithProducts
              };
            })
          );
      
          setOrders(ordersWithItems);
        } catch (error) {
          console.error('Full error:', error);
          toast.error('Erro ao carregar pedidos. Verifique o console para detalhes.');
        } finally {
          setLoading(false);
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

  const navigateToPreparation = (orderId: string) => {
    router.push(`/dashboard/preparacao-pedido/${orderId}`);
  };

  const getShortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pedidos Pendentes</h1>
        </div>

        {loading ? (
          <div className="flex justify-center my-8">
            <ClipLoader color="#3B82F6" size={40} />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum pedido pendente</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between text-gray-700 items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        order.sale_type === 'delivery' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.sale_type === 'delivery' ? <FiTruck size={14} /> : <FiHome size={14} />}
                        <span>{order.sale_type === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
                        {getStatusFromTranslation(order.status as OrderStatus)}
                      </span>
                    </div>
                    <h3 className="font-bold">Pedido #{getShortId(order.id)}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1">Cliente: {order.customer_name || 'Não informado'}</p>
                    <p className="font-bold mt-2">Total: R$ {order.total?.toFixed(2)}</p>
                  </div>
                  <button
                  onClick={() => navigateToPreparation(order.id)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <FiPackage  />
                  </button>
                </div>
                <div className="mt-3 border-t pt-3 text-gray-700">
                  <h4 className="font-semibold mb-2">Itens:</h4>
                  <ul className="space-y-1">
                    {order.items?.map((item) => (
                      <li key={item.id} className="text-gray-600 flex justify-between">
                        <span>
                          {item.quantity}x {item.product.name}
                        </span>
                        <span>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {order.notes && (
                  <div className="mt-3 border-t pt-3 text-gray-700">
                    <h4 className="font-semibold mb-1">Observações:</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{order.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => router.back()}
        className="fixed bottom-6 left-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
      >
        <LeftArrowIcon />
      </button>
    </div>
  );
}