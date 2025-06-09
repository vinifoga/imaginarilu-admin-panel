// components/SaleDetails.tsx
'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { PostgrestError } from '@supabase/supabase-js';
import { formatarData } from '@/utils/formatters';
import Image from 'next/image';
import { formatarMoeda } from '@/utils/moeda';
import LeftArrowIcon from './LeftArrowIcon';
import PrintIcon from './PrintIcon';
import { FiHome, FiTruck } from 'react-icons/fi';
import { OrderBadge } from './OrderBadge';
import { getStatusFromTranslation, OrderStatus } from '@/lib/orderStatus';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from './ConfirmationModal';

interface Sale {
  id: string;
  created_at: string;
  sale_type: 'pickup' | 'delivery';
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix';
  subtotal: number;
  total: number;
  status: string;
  notes: string;
  delivery_fee: number;
  addition_amount: number;
  discount_amount: number;

}

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_composition?: boolean;
  components?: {
    product_id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
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

interface SaleDetailsProps {
  backRoute?: string;
}

interface Product {
  id: string;
  name: string;
  is_composition: boolean;
}

interface SaleItemWithProduct {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_id: string;
  products: Product | null;
}

interface ProductImage {
  image_url: string;
}

interface NestedProduct {
  name: string;
  product_images?: ProductImage[];
}

interface ProductComponentDB {
  component_product_id: string;
  quantity: number;
  products?: NestedProduct | null;
}

export default function SaleDetails({ backRoute = '/dashboard/vendas' }: SaleDetailsProps) {
  const { id } = useParams();
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printForClient, setPrintForClient] = useState(false);

  const getShortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };
  // const formatTimeInterval = (time: string) => {
  //   if (!time) return 'Não especificado';

  //   const hour = time.split(':')[0];
  //   const nextHour = String(parseInt(hour) + 1).padStart(2, '0');

  //   return `${hour}:00 às ${nextHour}:00`;
  // };

  useEffect(() => {
    const fetchSaleData = async () => {
      try {
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', id)
          .single();

        if (saleError) throw saleError;

        setSale(saleData);

        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select(`
          id,
          quantity,
          unit_price,
          total_price,
          product_id,
          products (
            name,
            is_composition
          )
        `)
          .eq('sale_id', id) as { data: unknown[] | null, error: PostgrestError | null };

        if (itemsError) throw itemsError;

        if (itemsData !== null) {
          const formattedItems = await Promise.all(
            (itemsData as SaleItemWithProduct[]).map(async (item) => {
              const { data: imagensData } = await supabase
                .from('product_images')
                .select('image_url')
                .eq('product_id', item.product_id)
                .limit(1);

              const baseItem = {
                ...item,
                product_name: item.products?.name || '',
                product_image: imagensData?.[0]?.image_url || null,
                is_composition: item.products?.is_composition || false,
              };

              if (item.products?.is_composition) {
                const { data: componentsData } = await supabase
                  .from('product_components')
                  .select(`
            component_product_id,
            quantity,
            products:component_product_id (
              name,
              product_images (
                image_url
              )
            )
          `)
                  .eq('parent_product_id', item.product_id);

                const components = await Promise.all(
                  (componentsData as ProductComponentDB[] | null)?.map(async (component) => {
                    const { data: priceData } = await supabase
                      .from('products')
                      .select('sale_price')
                      .eq('id', component.component_product_id)
                      .single();

                    const productName = component.products?.name || '';
                    const productImage = component.products?.product_images?.[0]?.image_url || null;
                    const componentPrice = priceData?.sale_price || 0;
                    const componentQuantity = component.quantity * item.quantity;

                    return {
                      product_id: component.component_product_id,
                      product_name: productName,
                      product_image: productImage,
                      quantity: componentQuantity,
                      unit_price: componentPrice,
                      total_price: componentPrice * componentQuantity,
                    };
                  }) || []
                );

                return {
                  ...baseItem,
                  components,
                };
              }

              return baseItem;
            })
          );

          setItems(formattedItems);
        }

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromPreparation = urlParams.get('fromPreparation');

    if (fromPreparation === 'true') {
      setTimeout(() => {
        window.print();
        setTimeout(() => router.push('/dashboard/pedidos-pendentes'), 1000);
      }, 500);
    }
  }, [router]);

  const handlePrint = (forClient = false) => {
    setPrintForClient(forClient);

    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintForClient(false), 1000);
    }, 100);
  };

  // const getTopItemsImages = () => {
  //   const sortedItems = [...items].sort((a, b) => b.total_price - a.total_price);
  //   return sortedItems.slice(0, 3).filter(item => item.product_image);
  // };

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
  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      const dbStatus = getStatusFromTranslation(newStatus).toString();

      const { error } = await supabase
        .from('sales')
        .update({ status: dbStatus })
        .eq('id', id);

      if (error) throw error;
      setSale(prev => {
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

  const getStatusEnum = (statusString: string): OrderStatus => {
    return OrderStatus[statusString as keyof typeof OrderStatus];
  };

  const ThermalStatus = ({ currentStatus }: { currentStatus: OrderStatus }) => {
    const steps = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.PACKED,
      OrderStatus.DELIVERED
    ];

    const currentIndex = steps.indexOf(currentStatus);
    const isDelivered = currentStatus === OrderStatus.DELIVERED;

    return (
      <div className="hidden thermal-status print:block">
        <div className="flex justify-between items-center px-1">
          {steps.map((status, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex && !isDelivered;

            return (
              <div key={status} className="flex flex-col items-center flex-1">
                <div className={`w-4 h-4 flex items-center justify-center 
                  ${isCompleted ? 'bg-black text-white' :
                    isCurrent ? 'border-2 border-black' :
                      'border border-gray-400'}`}>
                  {isCompleted ? '✓' : isCurrent ? '•' : ''}
                </div>
                <span className={`text-[7px] mt-1 text-center ${isCurrent ? 'font-bold' : ''
                  }`}>
                  {status.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-2 md:p-6 bg-gray-900 text-white print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto print:max-w-none">
        <div
          ref={receiptRef}
          className={`thermal-receipt bg-white p-4 md:p-8 rounded-lg shadow-lg print:shadow-none print:p-0 print:rounded-none ${printForClient ? 'print-client' : ''}`}
        >
          {/* Cabeçalho simplificado para impressão */}
          <div className="flex flex-col items-center mb-4 print:mb-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm font-medium mb-3 print:mb-1 ${sale.sale_type === 'delivery' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
              {sale.sale_type === 'delivery' ? <FiTruck size={14} /> : <FiHome size={14} />}
              <span>{sale.sale_type === 'delivery' ? 'Entrega' : 'Retira'}</span>
              <div className="print:hidden"><OrderBadge
                status={getStatusEnum(sale.status)}
                onChange={handleStatusChange}
                key={sale.status}
              />
              </div>
            </div>

            {/* Mostra apenas 1 imagem principal na impressão */}
            {/* {getTopItemsImages().length > 0 && (
              <div className="flex justify-center gap-2 print:gap-0 print:justify-start">
                {getTopItemsImages().slice(0, 1).map((item, index) => (
                  <div key={index} className="w-12 h-12 md:w-20 md:h-20 rounded-lg overflow-hidden border print:w-10 print:h-10 print:border-none">
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
            )} */}
          </div>

          {/* Número do pedido e data - simplificado para impressão */}
          <div className="text-center mb-4 print:mb-2">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 print:text-sm print:font-normal">
              Pedido {getShortId(sale.id)}
            </h1>
            <p className="text-gray-600 text-xs md:text-sm print:text-xs">
              {formatarData(sale.created_at)}
            </p>
          </div>

          {/* Status Timeline */}
          <ThermalStatus
            currentStatus={getStatusEnum(sale.status)}
          />

          {/* Cliente - apenas nome e telefone */}
          {sale.sale_type === 'delivery' && deliveryInfo && (
            <div className="text-center mb-4 print:mb-2 print:text-left">
              <p className="text-gray-700 text-sm print:text-xs whitespace-pre-line">
                {deliveryInfo.customer_name} - {deliveryInfo.customer_phone}
              </p>
            </div>
          )}

          {/* Itens da venda - tabela simplificada */}
          <div className="mb-4 print:mb-2">
            <div className="border rounded-lg overflow-hidden print:border-none">
              <table className="w-full print:text-xs">
                <thead className="bg-gray-50 print:hidden">
                  <tr>
                    <th className="px-2 py-1 md:px-4 md:py-2 text-left text-gray-700">Produto</th>
                    <th className="px-2 py-1 md:px-4 md:py-2 text-right text-gray-700">Unit.</th>
                    <th className="px-2 py-1 md:px-4 md:py-2 text-right text-gray-700">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <Fragment key={`item-${item.id}`}>
                      {/* Item principal - sempre visível */}
                      <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} print:!bg-transparent`}>
                        <td className="px-2 py-1 md:px-4 md:py-2 print:py-0 print:border-none">
                          <div className="flex items-center gap-1 print:gap-0">
                            {item.product_image && (
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded overflow-hidden print:hidden">
                                <Image
                                  src={item.product_image}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <span className="text-sm md:text-base text-gray-700 print:text-xs print:font-bold">
                              {item.quantity}x {item.product_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-1 md:px-4 md:py-2 text-right text-gray-500 text-sm print:hidden">
                          {formatarMoeda(item.unit_price)}
                        </td>
                        <td className="px-2 py-1 md:px-4 md:py-2 text-right text-gray-700 font-medium text-sm print:text-xs print:py-0 print:border-none">
                          {formatarMoeda(item.total_price)}
                        </td>
                      </tr>
                      {item.components?.map((component, compIndex) => (
                        <tr key={`${item.id}-comp-${component.product_id}-${compIndex}`} className="print:!bg-transparent">
                          <td className="px-2 py-1 md:px-4 md:py-2 pl-8 print:pl-4 print:py-0 print:border-none">
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 print:text-[0.65rem]">
                                {component.quantity}x {component.product_name}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="mb-4 print:mb-2">
            <div className="bg-gray-50 p-2 rounded-lg print:bg-transparent print:p-0 print:border-t print:border-b print:border-gray-300 print:py-1">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>{formatarMoeda(sale.subtotal)}</span>
                </div>
                {!!sale.delivery_fee && (
                  <div className="flex justify-between items-center mb-2 text-gray-700">
                    <span className="text-gray-700">Taxa de Entrega:</span>
                    <span>+{formatarMoeda(sale.delivery_fee)}</span>
                  </div>
                )}
                {!!sale.addition_amount && (
                  <div className="flex justify-between items-center mb-2 text-gray-700">
                    <span className="text-gray-700">Acréscimo:</span>
                    <span>+{formatarMoeda(sale.addition_amount)}</span>
                  </div>
                )}
                {!!sale.discount_amount && (
                  <div className="flex justify-between items-center mb-2 text-gray-700">
                    <span className="text-gray-700">Desconto:</span>
                    <span>-{formatarMoeda(sale.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t text-gray-700 print:border-t-0">
                  <span>TOTAL:</span>
                  <span>{formatarMoeda(sale.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {sale.notes && (
            <div className="mb-4 bg-gray-50 p-2 print:bg-transparent print:p-0 print:py-1 notes-section">
              <p className="text-xs text-gray-700 whitespace-pre-line">
                <strong className="print:font-normal">Obs:</strong> {sale.notes}
              </p>
            </div>
          )}

          {deliveryInfo?.from && (
            <p className="text-sm text-gray-700">
              <strong>De:</strong> {deliveryInfo.from}
            </p>
          )}

          {deliveryInfo?.to && (
            <p className="text-sm text-gray-700">
              <strong>Para:</strong> {deliveryInfo?.to}
            </p>
          )}


          {deliveryInfo?.additional_info && (
            <div className="mt-3 additional-info">
              <p className="text-sm text-gray-700">
                <strong>Informações Adicionais:</strong> {deliveryInfo.additional_info}
              </p>
            </div>
          )}

          <br></br>
          {/* Informações de entrega - versão para tela */}
          {sale.sale_type === 'delivery' && deliveryInfo && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg print:hidden">
              <h3 className="font-bold text-gray-800 mb-2">Informações de Entrega - {getShortId(sale.id)}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700">
                    <strong>De:</strong> {deliveryInfo.from}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Para:</strong> {deliveryInfo.to}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Data:</strong> {formatarData(deliveryInfo.delivery_date)}
                    <span className="mx-2"></span>
                    <strong>Hora:</strong> {(deliveryInfo.delivery_time)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Endereço:</strong> {deliveryInfo.street}, {deliveryInfo.number}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Bairro:</strong> {deliveryInfo.neighborhood}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Cidade:</strong> {deliveryInfo.city}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>CEP:</strong> {deliveryInfo.cep}
                  </p>
                  {deliveryInfo.complement && (
                    <p className="text-sm text-gray-700">
                      <strong>Complemento:</strong> {deliveryInfo.complement}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Informações de entrega - versão para impressão */}
          {sale.sale_type === 'delivery' && deliveryInfo && (
            <div className="hidden print:block border-t border-gray-300 pt-2 mt-2 delivery-info">
              <h3 className="text-sm text-gray-700">Informações de Entrega - {getShortId(sale.id)}</h3>
              <br></br>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Para:</strong> {deliveryInfo.to}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Data:</strong> {formatarData(deliveryInfo.delivery_date)}
                    <span className="mx-2"></span>
                    <strong>Hora:</strong> {(deliveryInfo.delivery_time)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Endereço:</strong> {deliveryInfo.street}, {deliveryInfo.number}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Bairro:</strong> {deliveryInfo.neighborhood}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Cidade:</strong> {deliveryInfo.city}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>CEP:</strong> {deliveryInfo.cep}
                  </p>
                  {deliveryInfo.complement && (
                    <p className="text-sm text-gray-700">
                      <strong>Complemento:</strong> {deliveryInfo.complement}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação - apenas em tela */}
          <div className="fixed bottom-4 left-4 right-4 flex justify-between print:hidden">
            <button
              onClick={() => router.push(backRoute)}
              className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700"
            >
              <LeftArrowIcon />
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700"
            >
              <PrintIcon />
            </button>
          </div>
        </div>
      </div>
      <ToastContainer />

      {/* Modal de Confirmação de Impressão */}
      <ConfirmationModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onConfirm={() => {
          setShowPrintModal(false);
          handlePrint(true);
        }}
        onCancel={() => {
          setShowPrintModal(false);
          handlePrint();
        }}
        title="Imprimir Comprovante"
        message="Qual via quer imprimir?"
        confirmText="Cliente"
        cancelText="Loja"
      />
    </div>
  );
}
