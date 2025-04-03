// src/app/dashboard/preparacao-pedido/[orderId]/page.tsx
'use client';

import { supabase } from '@/lib/supabaseCliente';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiCheck, FiCheckCircle, FiHome, FiTruck, FiArrowLeft } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';
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
  prepared?: boolean;
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

export default function OrderPreparationPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [allItemsPrepared, setAllItemsPrepared] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Extrai o orderId dos params de forma assíncrona
    const getOrderId = async () => {
      const resolvedParams = await Promise.resolve(params);
      setOrderId(resolvedParams.orderId);
    };

    getOrderId();
  }, [params]);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        // Busca os dados do pedido
        const { data: orderData, error: orderError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;

        // Busca os itens do pedido
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', orderId);

        if (itemsError) throw itemsError;

        // Busca os produtos para cada item
        const itemsWithProducts = await Promise.all(
          (itemsData || []).map(async (item) => {
            const { data: productData } = await supabase
              .from('products')
              .select('id, name')
              .eq('id', item.product_id)
              .single();

            return {
              ...item,
              product: productData || { id: item.product_id, name: 'Produto não encontrado' },
              prepared: false // Inicializa todos os itens como não preparados
            };
          })
        );

        setOrder({
          ...orderData,
          items: itemsWithProducts
        });

        // Atualiza o status do pedido para "EM PREPARAÇÃO"
        updateOrderStatus('PREPARING');
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Erro ao carregar pedido');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]); // Agora depende do orderId em vez de params.orderId

  const updateOrderStatus = async (status: string) => {
    if (!orderId) return;

    try {
      const { error } = await supabase
        .from('sales')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Erro ao atualizar status do pedido');
    }
  };

  const toggleItemPrepared = (itemId: string) => {
    if (!order) return;

    const updatedItems = order.items.map(item => {
      if (item.id === itemId) {
        return { ...item, prepared: !item.prepared };
      }
      return item;
    });

    setOrder({
      ...order,
      items: updatedItems
    });

    // Verifica se todos os itens estão preparados
    const allPrepared = updatedItems.every(item => item.prepared);
    setAllItemsPrepared(allPrepared);
  };

  const completePreparation = async () => {
    if (!order) return;

    setPreparing(true);
    try {
      // Atualiza o status do pedido para "PRONTO"
      await updateOrderStatus('COMPLETED');
      toast.success('Pedido preparado com sucesso!');
      router.push('/dashboard/pedidos-pendentes');
    } catch (error) {
      console.error('Error completing preparation:', error);
      toast.error('Erro ao finalizar preparação');
    } finally {
      setPreparing(false);
    }
  };

  const getShortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen p-6 bg-gray-900 text-white flex items-center justify-center">
        <ClipLoader color="#3B82F6" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto rounded-lg shadow-md p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-blue-400 hover:text-blue-300"
        >
          <FiArrowLeft /> Voltar
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Preparação do Pedido</h1>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            allItemsPrepared ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
          }`}>
            {allItemsPrepared ? 'Pronto para finalizar' : 'Em preparação'}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 text-gray-700 mb-6">
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
              Em preparação
            </span>
          </div>
          
          <h3 className="font-bold text-lg">Pedido #{getShortId(order.id)}</h3>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleString()}
          </p>
          <p className="mt-2">Cliente: {order.customer_name || 'Não informado'}</p>
          <p className="font-bold mt-2">Total: R$ {order.total?.toFixed(2)}</p>
          
          {order.notes && (
            <div className="mt-3 border-t pt-3">
              <h4 className="font-semibold mb-1">Observações:</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4 text-gray-700">
          <h2 className="text-lg font-bold mb-4">Itens do Pedido</h2>
          
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleItemPrepared(item.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      item.prepared 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300'
                    }`}
                  >
                    {item.prepared && <FiCheck size={14} />}
                  </button>
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">{item.quantity}x R$ {item.unit_price.toFixed(2)}</p>
                  </div>
                </div>
                <p className="font-medium">R$ {(item.unit_price * item.quantity).toFixed(2)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t">
            <button
              onClick={completePreparation}
              disabled={!allItemsPrepared || preparing}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 ${
                allItemsPrepared
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {preparing ? (
                <>
                  <ClipLoader color="#ffffff" size={20} />
                  <span>Finalizando...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle size={18} />
                  <span>Finalizar Preparação</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}