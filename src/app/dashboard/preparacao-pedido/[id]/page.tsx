// src/app/dashboard/preparacao-pedido/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation'; 
import { supabase } from '@/lib/supabaseCliente';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Adicionei o hook use
import { FiTruck, FiHome } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getStatusFromTranslation, OrderStatus } from '@/lib/orderStatus';
import { OrderBadge } from '../../../../../components/OrderBadge';
import LeftArrowIcon from '../../../../../components/LeftArrowIcon';
import CheckIcon from '../../../../../components/CheckIcon';
import { ToastContainer } from 'react-toastify';
import ConfirmationModal from '../../../../../components/ConfirmationModal';

interface Product {
  id: string;
  name: string;
  description: string;
  is_composition: boolean;
  barcode: string;
  image_url?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_id: string;
  is_composite: boolean;
  product: Product;
  components?: OrderItem[];
  picked_quantity: number;
}

interface Order {
    id: string;
    created_at: string;
    customer_name?: string;
    total: number;
    status: string;
    sale_type: 'pickup' | 'delivery';
    items: OrderItem[];
    notes?: string;
    delivery_date?: string; // Adicione estes campos
    delivery_time?: string;
  }

  export default function OrderPreparationPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [showPrintConfirmation, setShowPrintConfirmation] = useState(false);
    const [showIncompleteItemsModal, setShowIncompleteItemsModal] = useState(false);  

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        // Busca o pedido principal - agora usando o id desempacotado
        const { data: orderData, error: orderError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', id)
          .single();

        if (orderError || !orderData) {
          throw orderError || new Error('Pedido não encontrado');
        }

        let deliveryInfo = null;
        if (orderData.sale_type === 'delivery') {
        const { data: deliveryData, error: deliveryError } = await supabase
            .from('delivery_infos')
            .select('customer_name, delivery_date, delivery_time')
            .eq('sale_id', orderData.id)
            .single();

        if (!deliveryError && deliveryData) {
            deliveryInfo = deliveryData;
        }
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', id);

        if (itemsError) {
          throw itemsError;
        }

        const itemsWithProducts = await Promise.all(
          (itemsData || []).map(async (item) => {
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('*')
              .eq('id', item.product_id)
              .single();

            if (productError) {
              console.error(`Product error for item ${item.id}:`, productError);
              return {
                ...item,
                product: {
                  id: item.product_id,
                  name: 'Produto não encontrado',
                  description: '',
                  is_composition: false,
                  barcode: ''
                },
                picked_quantity: 0
              };
            }

            let components: OrderItem[] = [];
            if (productData.is_composition) {
              const { data: componentsData, error: componentsError } = await supabase
                .from('product_components')
                .select('component_product_id, quantity')
                .eq('parent_product_id', productData.id);

              if (!componentsError && componentsData) {
                const componentItems = await Promise.all(
                  componentsData.map(async (component) => {
                    const { data: componentProductData } = await supabase
                      .from('products')
                      .select('*')
                      .eq('id', component.component_product_id)
                      .single();

                    return {
                      id: `${item.id}-${component.component_product_id}`,
                      product_id: component.component_product_id,
                      quantity: component.quantity * item.quantity,
                      unit_price: componentProductData?.cost_price || 0,
                      total_price: (componentProductData?.cost_price || 0) * component.quantity * item.quantity,
                      is_composite: false,
                      product: componentProductData || {
                        id: component.component_product_id,
                        name: 'Componente não encontrado',
                        description: '',
                        is_composition: false,
                        barcode: ''
                      },
                      picked_quantity: 0
                    };
                  })
                );
                components = componentItems;
              }
            }

            return {
              ...item,
              product: productData,
              components,
              picked_quantity: 0
            };
          })
        );

        let customerName = '';
        if (orderData.sale_type === 'delivery') {
          const { data: deliveryData, error: deliveryError } = await supabase
            .from('delivery_infos')
            .select('customer_name')
            .eq('sale_id', orderData.id)
            .single();

          if (!deliveryError && deliveryData) {
            customerName = deliveryData.customer_name;
          }
        }

        setOrder({
          ...orderData,
          items: itemsWithProducts,
          customer_name: customerName,
          delivery_date: deliveryInfo?.delivery_date,
          delivery_time: deliveryInfo?.delivery_time
        });
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Erro ao carregar pedido');
        router.push('/dashboard/pedidos-pendentes');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, router]); // Agora usando id em vez de params.id

  // Restante do código permanece exatamente o mesmo...
  const handlePickedQuantityChange = (
    itemId: string,
    componentId: string | null,
    newQuantity: number
  ) => {
    if (!order) return;

    const updatedItems = order.items.map(item => {
      if (item.id === itemId) {
        if (componentId && item.components) {
          const updatedComponents = item.components.map(component => {
            if (component.id === componentId) {
              return {
                ...component,
                picked_quantity: Math.min(Math.max(newQuantity, 0), component.quantity)
              };
            }
            return component;
          });

          const allComponentsPicked = updatedComponents.every(
            comp => comp.picked_quantity === comp.quantity
          );

          return {
            ...item,
            components: updatedComponents,
            picked_quantity: allComponentsPicked ? item.quantity : Math.min(item.picked_quantity, item.quantity)
          };
        }

        return {
          ...item,
          picked_quantity: Math.min(Math.max(newQuantity, 0), item.quantity)
        };
      }
      return item;
    });

    setOrder({
      ...order,
      items: updatedItems
    });
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    try {
          // Converte o enum para o formato do banco de dados
          const dbStatus = getStatusFromTranslation(newStatus).toString();
          
          const { error } = await supabase
            .from('sales')
            .update({ status: dbStatus })
            .eq('id', id);
      
          if (error) throw error;
      
          // Atualiza o estado local de forma mais eficiente
          setOrder(prev => {
            console.log(prev)
            console.log(newStatus)
            if (!prev) return null;
            return {
              ...prev,
              status: getStatusFromTranslation(newStatus)
            };
          });
          
          toast.success(`Status atualizado para ${newStatus}`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          });
          
        } catch (error) {
          console.error('Erro ao atualizar status:', error);
          toast.error('Erro ao atualizar status do pedido', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          });
        }
      };

      const completePreparation = async () => {
        if (!order) return;
      
        const allItemsPicked = order.items.every(
          item => item.picked_quantity === item.quantity
        );
      
        if (!allItemsPicked) {
          setShowIncompleteItemsModal(true);
          return;
        }
      
        setShowCompletionModal(true);
      };
      
      const confirmCompletePreparation = async () => {
        setShowCompletionModal(false);
        setUpdating(true);
        
        try {
          if (!order) return;
          
          const newStatus = order.sale_type === 'delivery' 
            ? OrderStatus.PACKED 
            : OrderStatus.AWAITING_PICKUP;
        
          const dbStatus = getStatusFromTranslation(newStatus).toString();
      
          const { error } = await supabase
            .from('sales')
            .update({ status: dbStatus })
            .eq('id', order.id);
      
          if (error) throw error;
      
          toast.success('Preparação do pedido concluída com sucesso!');
          setShowPrintConfirmation(true);
          
        } catch (error) {
          console.error('Error completing preparation:', error);
          toast.error('Erro ao concluir preparação');
        } finally {
          setUpdating(false);
        }
      };
      
      const handlePrintConfirmation = (shouldPrint: boolean) => {
        setShowPrintConfirmation(false);
        if (shouldPrint && order) {
          router.push(`/dashboard/vendas/detalhes/${order.id}?fromPreparation=true`);
        } else {
          router.push('/dashboard/pedidos-pendentes');
        }
      };

  const getShortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-900 text-white flex items-center justify-center">
        <ClipLoader color="#3B82F6" size={40} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen p-6 bg-gray-900 text-white flex items-center justify-center">
        <p>Pedido não encontrado</p>
      </div>
    );
  }

  const getStatusEnum = (statusString: string): OrderStatus => {
      return OrderStatus[statusString as keyof typeof OrderStatus];
    };

    const formatDeliveryDateTime = (date: string, time: string) => {
        try {
          const [year, month, day] = date.split('-');
          const [hours, minutes] = time.split(':');
          const deliveryDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes)
          );
          
          return deliveryDate.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return `${date} às ${time}`;
        }
      };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
         
          <h1 className="text-2xl font-bold">Preparação do Pedido</h1>
          <div className="w-8"></div>
        </div>
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/pedidos-pendentes')}
            className="text-gray-400 hover:text-white"
          >
            <LeftArrowIcon />
          </button>
          <h1 className="text-2xl font-bold">Preparação do Pedido</h1>
        </div>
      </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-start">
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
                <OrderBadge 
                  status={getStatusEnum(order.status)} 
                  onChange={updateOrderStatus}
                />
              </div>
              <h3 className="font-bold text-lg">Pedido #{getShortId(order.id)}</h3>
              <p className="text-sm text-gray-400">
              {order.sale_type === 'delivery' && order.delivery_date && order.delivery_time 
                  ? `Entrega: ${formatDeliveryDateTime(order.delivery_date, order.delivery_time)}`
                  : `Criado em: ${new Date(order.created_at).toLocaleString()}`}
              </p>
              <p className="text-sm text-gray-400">
                  Criado em: {new Date(order.created_at).toLocaleString()}
              </p>
              <p className="mt-1">
                {order.sale_type === 'delivery' 
                  ? `Cliente: ${order.customer_name || 'Não informado'}` 
                  : 'Retirada no local'}
              </p>
              <p className="font-bold mt-2">Total: R$ {order.total?.toFixed(2).replace('.',',')}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Itens para Separação</h2>
          
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className={`bg-gray-800 rounded-lg p-4 ${item.picked_quantity === item.quantity ? 'border-l-4 border-green-500' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.picked_quantity === item.quantity}
                    onChange={(e) => {
                      const newQuantity = e.target.checked ? item.quantity : 0;
                      handlePickedQuantityChange(item.id, null, newQuantity);
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    id={`item-${item.id}`}
                  />
                  <label 
                    htmlFor={`item-${item.id}`} 
                    className="font-medium cursor-pointer select-none"
                  >
                    {item.quantity}x {item.product.name}
                  </label>
                </div>
              </div>
            
              {item.components && item.components.length > 0 && (
                <div className="ml-8 mt-3 pl-4 border-l-2 border-gray-600 space-y-3">
                  {item.components.map((component) => (
                    <div key={component.id} className={`flex justify-between items-center ${component.picked_quantity === component.quantity ? 'text-green-400' : ''}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={component.picked_quantity === component.quantity}
                          onChange={(e) => {
                            const newQuantity = e.target.checked ? component.quantity : 0;
                            handlePickedQuantityChange(item.id, component.id, newQuantity);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          id={`component-${component.id}`}
                        />
                        <label 
                          htmlFor={`component-${component.id}`} 
                          className="text-sm cursor-pointer select-none"
                        >
                          {component.quantity}x {component.product.name}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            ))}
          </div>
        </div>

        {order.notes && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Observações</h2>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="whitespace-pre-line">{order.notes}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-20"></div>

      <button
        onClick={() => router.push('/dashboard/pedidos-pendentes')}
        className="fixed bottom-6 left-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
      >
        <LeftArrowIcon />
      </button>

      {/* Botão Flutuante para Adicionar Novo Produto */}
      <button
        onClick={completePreparation}
        disabled={updating}
        className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700"
      >
        <CheckIcon  />
      </button>
      <ToastContainer />
      <ConfirmationModal
      isOpen={showCompletionModal}
      onClose={() => setShowCompletionModal(false)}
      onConfirm={confirmCompletePreparation}
      title="Confirmar Conclusão"
      message="Tem certeza que deseja marcar este pedido como preparado?"
      confirmText="Confirmar"
      cancelText="Cancelar"
    />

    {/* Modal de Confirmação de Impressão */}
    <ConfirmationModal
      isOpen={showPrintConfirmation}
      onClose={() => handlePrintConfirmation(false)}
      onConfirm={() => handlePrintConfirmation(true)}
      title="Preparação Concluída"
      message="Deseja imprimir o comprovante do pedido?"
      confirmText="Imprimir"
      cancelText="Não Imprimir"
    />

    {/* Modal de Itens Incompletos */}
    <ConfirmationModal
      isOpen={showIncompleteItemsModal}
      onClose={() => setShowIncompleteItemsModal(false)}
      onConfirm={() => setShowIncompleteItemsModal(false)}
      title="Separação Incompleta"
      message="Complete a separação de todos os itens antes de finalizar a preparação."
      confirmText="Entendi"
    />
    </div>
  );
}