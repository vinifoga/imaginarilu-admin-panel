// src/app/dashboard/vendas/comprovante/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { PostgrestError } from '@supabase/supabase-js';
import { formatarData } from '@/utils/formatters';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Image from 'next/image';
import { formatarMoeda } from '@/utils/moeda';

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
  address: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  additional_info: string;
}

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

          console.log(formattedItems)

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

  const handleExportPDF = async () => {
    if (!receiptRef.current) return;
    
    const canvas = await html2canvas(receiptRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`comprovante-venda-${id}.pdf`);
  };

  const getTopItemsImages = () => {
    // Ordena os itens por valor total (do maior para o menor)
    const sortedItems = [...items].sort((a, b) => b.total_price - a.total_price);
    // Pega os 3 primeiros itens (ou menos se houver menos itens)
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
        {/* Controles de impressão/exportação */}
        <div className="flex justify-end gap-4 mb-6 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Imprimir
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Exportar PDF
          </button>
          <button
            onClick={() => router.push('/dashboard/vendas')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Voltar
          </button>
        </div>

        {/* Comprovante (área a ser impressa/exportada) */}
        <div 
          ref={receiptRef}
          className="bg-white p-8 rounded-lg shadow-lg print:shadow-none print:p-0"
        >
          {/* Cabeçalho com imagens dos produtos mais caros */}
          {getTopItemsImages().length > 0 && (
            <div className="flex justify-center gap-4 mb-6">
              {getTopItemsImages().map((item, index) => (
                <div key={index} className="w-24 h-24 rounded-lg overflow-hidden border">
                  <Image
                    src={item.product_image!}
                    alt={item.product_name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Informações da venda */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Comprovante de Venda</h1>
            <p className="text-gray-600">Nº {sale.id}</p>
            <p className="text-gray-600">{formatarData(sale.created_at)}</p>
          </div>

          {/* Tipo de venda */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {sale.sale_type === 'delivery' ? 'Entrega' : 'Retirada no Local'}
            </h2>
            {sale.sale_type === 'delivery' && deliveryInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700">Cliente</h3>
                  <p>{deliveryInfo.customer_name}</p>
                  <p>{deliveryInfo.customer_phone}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Endereço</h3>
                  <p>
                    {deliveryInfo.address.logradouro}, {deliveryInfo.address.numero}
                    {deliveryInfo.address.complemento && `, ${deliveryInfo.address.complemento}`}
                  </p>
                  <p>
                    {deliveryInfo.address.bairro} - {deliveryInfo.address.cidade}/{deliveryInfo.address.uf}
                  </p>
                  <p>CEP: {deliveryInfo.address.cep}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Data/Hora</h3>
                  <p>{formatarData(deliveryInfo.delivery_date, true)}</p>
                </div>
                {deliveryInfo.additional_info && (
                  <div>
                    <h3 className="font-medium text-gray-700">Informações Adicionais</h3>
                    <p>{deliveryInfo.additional_info}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Itens da venda */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Itens</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700">Item</th>
                    <th className="px-4 py-2 text-right text-gray-700">Qtd</th>
                    <th className="px-4 py-2 text-right text-gray-700">Preço Unit.</th>
                    <th className="px-4 py-2 text-right text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {item.product_image && (
                            <div className="w-10 h-10 rounded overflow-hidden">
                              <Image
                                src={item.product_image}
                                alt={item.product_name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <span>{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{formatarMoeda(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right text-gray-500 font-medium">
                        {formatarMoeda(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Pagamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Método de Pagamento</h3>
                <p className="text-lg text-gray-700">
                  {sale.payment_method === 'cash' && 'Dinheiro'}
                  {sale.payment_method === 'credit_card' && 'Cartão de Crédito'}
                  {sale.payment_method === 'debit_card' && 'Cartão de Débito'}
                  {sale.payment_method === 'pix' && 'PIX'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Resumo Financeiro</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span>{formatarMoeda(sale.subtotal)}</span>
                  </div>
                  {/* Aqui você pode adicionar descontos/acréscimos se tiver esses dados */}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t text-gray-700">
                    <span>Total:</span>
                    <span>{formatarMoeda(sale.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {sale.notes && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Observações</h2>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-gray-700">
                {sale.notes}
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="text-center text-gray-500 text-sm mt-8">
            <p>Obrigado pela sua compra!</p>
            <p>Em caso de dúvidas, entre em contato conosco.</p>
          </div>
        </div>
      </div>
    </div>
  );
}