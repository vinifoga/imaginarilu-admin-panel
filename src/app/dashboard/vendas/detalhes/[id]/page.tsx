'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { formatarMoeda } from '@/utils/moeda';
import { FiArrowLeft, FiPrinter, FiCalendar, FiPackage, FiTruck } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleDetails {
  id: string;
  created_at: string;
  sale_type: 'pickup' | 'delivery';
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix';
  subtotal: number;
  total: number;
  status: string;
  notes: string;
  items: SaleItem[];
  delivery_info?: {
    customer_name: string;
    customer_phone: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    complement?: string;
    additional_info?: string;
  };
}

export default function SaleDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const [sale, setSale] = useState<SaleDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaleDetails = async () => {
      try {
        // 1. Buscar dados básicos da venda
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', id)
          .single();

        if (saleError) throw saleError;

        // 2. Buscar itens da venda
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', id);

        if (itemsError) throw itemsError;

        // 3. Se for entrega, buscar informações de entrega
        let deliveryInfo = null;
        if (saleData.sale_type === 'delivery') {
          const { data: deliveryData, error: deliveryError } = await supabase
            .from('delivery_infos')
            .select('*')
            .eq('sale_id', id)
            .single();

          if (deliveryError) throw deliveryError;
          deliveryInfo = deliveryData;
        }

        // Mapear itens com nomes de produtos (se necessário)
        const itemsWithNames = await Promise.all(
          itemsData.map(async (item) => {
            // Se já tiver o nome do produto, retorna como está
            if (item.product_name) return item;
            
            // Caso contrário, busca o nome do produto
            const { data: productData } = await supabase
              .from('products')
              .select('name')
              .eq('id', item.product_id)
              .single();

            return {
              ...item,
              product_name: productData?.name || `Produto ${item.product_id}`
            };
          })
        );

        setSale({
          ...saleData,
          items: itemsWithNames,
          delivery_info: deliveryInfo
        });
      } catch (error) {
        console.error('Error fetching sale details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaleDetails();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const translatePaymentMethod = (method: string) => {
    switch(method) {
      case 'cash': return 'Dinheiro';
      case 'credit_card': return 'Cartão de Crédito';
      case 'debit_card': return 'Cartão de Débito';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const printSale = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <ClipLoader color="#ffffff" size={50} />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Venda não encontrada
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <FiArrowLeft /> Voltar
          </button>
          
          <button
            onClick={printSale}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            <FiPrinter /> Imprimir
          </button>
        </div>

        {/* Informações da venda */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">
              Venda #{sale.id.slice(0, 8).toUpperCase()}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              sale.status === 'completed' ? 'bg-green-900 text-green-300' :
              sale.status === 'cancelled' ? 'bg-red-900 text-red-300' :
              'bg-yellow-900 text-yellow-300'
            }`}>
              {sale.status === 'completed' ? 'Concluído' :
               sale.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FiCalendar /> Informações da Venda
              </h3>
              <p className="mb-1"><span className="text-gray-400">Data:</span> {formatDate(sale.created_at)}</p>
              <p className="mb-1"><span className="text-gray-400">Tipo:</span> {sale.sale_type === 'delivery' ? 'Entrega' : 'Retirada'}</p>
              <p><span className="text-gray-400">Pagamento:</span> {translatePaymentMethod(sale.payment_method)}</p>
            </div>

            {sale.sale_type === 'delivery' && sale.delivery_info && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FiTruck /> Informações de Entrega
                </h3>
                <p className="mb-1"><span className="text-gray-400">Cliente:</span> {sale.delivery_info.customer_name}</p>
                <p className="mb-1"><span className="text-gray-400">Telefone:</span> {sale.delivery_info.customer_phone}</p>
                <p className="mb-1"><span className="text-gray-400">Endereço:</span> {sale.delivery_info.street}, {sale.delivery_info.number}</p>
                <p><span className="text-gray-400">Bairro/Cidade:</span> {sale.delivery_info.neighborhood}, {sale.delivery_info.city}</p>
              </div>
            )}
          </div>
        </div>

        {/* Itens da venda */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FiPackage /> Itens da Venda
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-2">Produto</th>
                  <th className="pb-2 text-right">Quantidade</th>
                  <th className="pb-2 text-right">Preço Unitário</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700">
                    <td className="py-3">{item.product_name}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">{formatarMoeda(item.unit_price)}</td>
                    <td className="py-3 text-right text-blue-400 font-medium">
                      {formatarMoeda(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right font-bold">Subtotal:</td>
                  <td className="pt-3 text-right">{formatarMoeda(sale.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pt-3 text-right font-bold">Total:</td>
                  <td className="pt-3 text-right text-green-400 font-bold text-xl">
                    {formatarMoeda(sale.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Observações */}
        {sale.notes && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Observações</h3>
            <div className="bg-gray-700 p-4 rounded-lg whitespace-pre-line">
              {sale.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}