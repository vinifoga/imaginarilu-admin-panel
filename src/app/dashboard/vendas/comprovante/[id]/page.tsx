// src/app/dashboard/vendas/comprovante/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { PostgrestError } from '@supabase/supabase-js';
import { formatarData } from '@/utils/formatters';
import Image from 'next/image';
import { formatarMoeda } from '@/utils/moeda';
import LeftArrowIcon from '../../../../../../components/LeftArrowIcon';
import PrintIcon from '../../../../../../components/PrintIcon';
import { FiHome, FiTruck } from 'react-icons/fi';
import { OrderBadge } from '../../../../../../components/OrderBadge';
import { OrderStatus } from '@/lib/orderStatus';

interface Sale {
  id: string;
  created_at: string;
  sale_type: 'pickup' | 'delivery';
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix';
  subtotal: number;
  total: number;
  status: string;
  notes: string;
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface DeliveryInfo {
  customer_name: string;
  customer_phone: string;
  delivery_date: string;
  delivery_time: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  uf: string;
  additional_info: string;
  from: string;
  to: string;
}

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para gerar um ID curto a partir do UUID
  const getShortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  useEffect(() => {
    const fetchSaleData = async () => {
      try {
        // Buscar dados da venda
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', id)
          .single();

        if (saleError) throw saleError;

        setSale(saleData);

        // Buscar itens da venda
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select(`
            id,
            quantity,
            unit_price,
            total_price,
            product_id
          `)
          .eq('sale_id', id) as { data: SaleItem[] | null, error: PostgrestError | null };

        if (itemsError) throw itemsError;
        
        if(itemsData !== null){
          // Buscar imagem dos itens
          const formattedItems = await Promise.all(
            itemsData.map(async (item) => {
              if (typeof item === 'object' && item !== null) {
                const { data: imagensData, error: imagensError } = await supabase
                  .from('product_images')
                  .select('image_url')
                  .eq('product_id', item.product_id)
                  .limit(1);
    
                if (imagensError) {
                  console.error('Erro ao buscar imagens:', imagensError);
                }
    
                return {
                  ...item,
                  product_name: item.product_name,
                  product_image: imagensData?.[0]?.image_url || null,
                };
              }
              return item;
            })
          );

          setItems(formattedItems);
        }

        // Se for entrega, buscar informações de entrega
        if (saleData.sale_type === 'delivery') {
          const { data: deliveryData, error: deliveryError } = await supabase
            .from('delivery_infos')
            .select('*')
            .eq('sale_id', id)
            .single();

          if (deliveryError) throw deliveryError;
          setDeliveryInfo(deliveryData);

        }

      } catch (error) {
        console.error('Error fetching sale data:', error);
        alert('Erro ao carregar dados da venda');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaleData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const getTopItemsImages = () => {
    const sortedItems = [...items].sort((a, b) => b.total_price - a.total_price);
    return sortedItems.slice(0, 3).filter(item => item.product_image);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Carregando comprovante...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Venda não encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <div 
          ref={receiptRef}
          className="bg-white p-8 rounded-lg shadow-lg print:shadow-none print:p-0"
        >
          {/* Cabeçalho com badge de tipo e imagens */}
          <div className="flex flex-col items-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${
              sale.sale_type === 'delivery' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {sale.sale_type === 'delivery' ? <FiTruck /> : <FiHome />}
              <span>{sale.sale_type === 'delivery' ? 'Entrega' : 'Retira'}</span>
              <OrderBadge status={OrderStatus.PENDING} />
            </div>

            
            {getTopItemsImages().length > 0 && (
              <div className="flex justify-center gap-4">
                {getTopItemsImages().map((item, index) => (
                  <div key={index} className="w-20 h-20 rounded-lg overflow-hidden border">
                    <Image
                      src={item.product_image!}
                      alt={item.product_name || `Product image ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Número do pedido e data */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Pedido - {getShortId(sale.id)}</h1>
            <p className="text-gray-600 text-sm">{formatarData(sale.created_at)}</p>
          </div>

          {sale.sale_type === 'delivery' && deliveryInfo && (
            <div className="text-center mb-6">
                <p className="text-gray-700 whitespace-pre-line">{deliveryInfo.customer_name} - {deliveryInfo.customer_phone}</p>
            </div>
          )}

          {/* Itens da venda */}
          <div className="mb-6">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700">Produto</th>
                    <th className="px-4 py-2 text-right text-gray-700">Qtd</th>
                    <th className="px-4 py-2 text-right text-gray-700">Unit.</th>
                    <th className="px-4 py-2 text-right text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {item.product_image && (
                            <div className="w-8 h-8 rounded overflow-hidden">
                              <Image
                                src={item.product_image}
                                alt={item.product_name || `Product image ${index + 1}`}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <span className="text-sm">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500 text-sm">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatarMoeda(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right text-gray-500 font-medium text-sm">
                        {formatarMoeda(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>{formatarMoeda(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t text-gray-700">
                  <span>Total:</span>
                  <span>{formatarMoeda(sale.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {sale.notes && (
            <div className="mb-6 bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-line">{sale.notes}</p>
            </div>
          )}

          {sale.sale_type === 'delivery' && deliveryInfo &&(
                <div>
                  <h3 className="font-medium text-gray-700">Informações Adicionais</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{deliveryInfo.additional_info}</p>
                </div>
          )}

          {sale.sale_type === 'delivery' && deliveryInfo && ( 
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-dashed border-gray-400"></div>
              <svg className="flex-shrink-0 mx-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m7-7l-7-7m7 7l2.879-2.879"/>
              </svg>
              <div className="flex-grow border-t border-dashed border-gray-400"></div>
            </div>
          )}

          {/* Informações de entrega (se aplicável) */}
          {sale.sale_type === 'delivery' && deliveryInfo && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center mb-6">
              <h1 className="text-medium font-bold text-gray-800">Pedido - {getShortId(sale.id)}</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-medium text-gray-700">Data: {formatarData(deliveryInfo.delivery_date)}</span>
                <span className="text-medium text-gray-700">Hora: {deliveryInfo.delivery_time}</span>
              </div>
              <span className="text-medium text-gray-700">Para: {deliveryInfo.to}</span>
              {deliveryInfo && (
                <div>
                  <h3 className="font-medium text-gray-700">Endereço</h3>
                  <p className="font-medium text-gray-700 whitespace-pre-line">
                    {deliveryInfo.street}, {deliveryInfo.number}
                  </p>
                  <p className="font-medium text-gray-700 whitespace-pre-line">
                    {deliveryInfo.neighborhood} - {deliveryInfo.city}/{deliveryInfo.uf}
                  </p>
                  <p className="font-medium text-gray-700 whitespace-pre-line">
                    {deliveryInfo.complement}
                  </p>
              </div>
              )}
            </div>
          </div>
        )}

          {/* Botões de ação */}
          <button
            onClick={() => router.push('/dashboard/vendas')}
            className="fixed bottom-6 left-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
          >
            <LeftArrowIcon />
          </button>
          
          <button
            onClick={handlePrint}
            className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
          >
            <PrintIcon />
          </button>
        </div>
      </div>
    </div>
  );
}