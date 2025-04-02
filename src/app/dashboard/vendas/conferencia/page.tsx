// src/app/dashboard/vendas/conferencia/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { formatarMoeda, formatarPorcentagem } from '@/utils/moeda';
import { IMaskInput } from 'react-imask';
import axios from 'axios';
import { CurrencyInput } from '../../../../../components/CurrencyInput';
import { PercentageInput } from '../../../../../components/PercentageInput';

interface Product {
  id: string;
  name: string;
  description: string;
  barcode: string;
  sku: string;
  sale_price: number;
  image_url: string | null;
  is_composition: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface PaymentDetails {
  discount: PaymentAdjustment;
  addition: PaymentAdjustment;
  cashAmount: number;
  showDiscount: boolean;
  showAddition: boolean;
}

interface PaymentAdjustment {
  type: 'fixed' | 'percentage';
  value: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [saleType, setSaleType] = useState<'pickup' | 'delivery'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>();
  const [deliveryInfo, setDeliveryInfo] = useState({
    customerName: '',
    customerPhone: '',
    deliveryDate: '',
    deliveryTime: '',
    address: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      uf: ''
    },
    from: '',
    to: '',
    additionalInfo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    discount: { type: 'fixed', value: 0 },
    addition: { type: 'fixed', value: 0 },
    cashAmount: 0,
    showDiscount: false,
    showAddition: false
  });
  const [observations, setObservations] = useState('');



  useEffect(() => {
    const cartParam = searchParams.get('cart');
    if (cartParam) {
      try {
        const items = JSON.parse(cartParam);
        setCartItems(items);
      } catch (error) {
        console.error('Error parsing cart items:', error);
      }
    }
  }, [searchParams]);

  const calcularValorTotal = () => {
    const subtotal = cartItems.reduce((total, item) => {
      return total + (item.product.sale_price * item.quantity);
    }, 0);
  
    // Calcular desconto
    const discountValue = paymentDetails.discount.type === 'percentage' 
      ? subtotal * (paymentDetails.discount.value / 100)
      : paymentDetails.discount.value;
  
    // Calcular acréscimo
    const additionValue = paymentDetails.addition.type === 'percentage' 
      ? subtotal * (paymentDetails.addition.value / 100)
      : paymentDetails.addition.value;
  
    return subtotal + additionValue - discountValue;
  };

  const calcularTroco = () => {
    if (paymentMethod !== 'cash' || paymentDetails.cashAmount <= 0) return 0;
    return paymentDetails.cashAmount - calcularValorTotal();
  };

  const handleAdjustmentChange = (field: 'discount' | 'addition', key: keyof PaymentAdjustment, value: string | number) => {
    if (key === 'type') {
      setPaymentDetails(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          type: value
        }
      }));
    } else if (key === 'value') {
      // Garante que o valor é numérico
      const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
      
      // Limita porcentagem a 100% e garante que é positivo
      const adjustedValue = Math.min(
        Math.max(numValue, 0), 
        paymentDetails[field].type === 'percentage' ? 100 : Number.MAX_SAFE_INTEGER
      );
      
      setPaymentDetails(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          value: adjustedValue
        }
      }));
    }
  };

  const toggleAdjustment = (field: 'discount' | 'addition') => {
    setPaymentDetails(prev => ({
      ...prev,
      [field === 'discount' ? 'showAddition' : 'showDiscount']: false,
      [field === 'discount' ? 'showDiscount' : 'showAddition']: !prev[field === 'discount' ? 'showDiscount' : 'showAddition']
    }));
  };
  

  const handleDeliveryInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setDeliveryInfo(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else {
      setDeliveryInfo(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCepBlur = async () => {
    const cep = deliveryInfo.address.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      const data = response.data;
      console.log(data)

      if (!data.erro) {
        setDeliveryInfo(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            uf: data.uf
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const getSubTotal = () => {
    return formatarMoeda(cartItems.reduce((total: number, item: CartItem) => total + (item.product.sale_price * item.quantity), 0));
  };

  const getSubTotalNumeric = () => {
    return cartItems.reduce((total: number, item: CartItem) => total + (item.product.sale_price * item.quantity), 0);
  }

  const translatePaymentMethod = (method: "cash" | "credit_card" | "debit_card" | "pix" | undefined): string => {
    switch(method) {
      case 'cash':
        return 'Dinheiro';
      case 'credit_card':
        return 'Cartão de Crédito';
      case 'debit_card':
        return 'Cartão de Débito';
      case 'pix':
        return 'PIX';
      default:
        return 'Método não especificado';
    }
  };

  const getObservationsDetails = () => {
    let notes ='';

    if(observations.length>0){
      notes = "\n\n";

    }
    notes += `Meio de pagamento: ${translatePaymentMethod(paymentMethod)}\n`;
    notes += `Subtotal: ${getSubTotal()}\n`;
    if(paymentDetails.discount.value !== 0){
      if(paymentDetails.discount.type === 'percentage'){
        notes += `Desconto: ${formatarPorcentagem(paymentDetails.discount.value)} \n`
      } else {
        notes += `Desconto: ${formatarMoeda(paymentDetails.discount.value)} \n`;
      }        
    }

    if(paymentDetails.addition.value !== 0){
      if(paymentDetails.addition.type === 'percentage'){
        notes += `Acréscimo:  ${formatarPorcentagem(paymentDetails.addition.value)} \n`;
      } else {
        notes += `Acréscimo:  ${formatarMoeda(paymentDetails.addition.value)} \n`;
      }

    }

    notes += `Total: ${formatarMoeda(calcularValorTotal())}\n`;

    if(paymentMethod === 'cash'){
      notes += `Valor Pago:  ${formatarMoeda(paymentDetails.cashAmount)} \n`;
      notes += `Troco:  ${formatarMoeda(calcularTroco())} \n`;
    }

    return notes;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_type: saleType,
          payment_method: paymentMethod,
          subtotal: getSubTotalNumeric(),
          total: calcularValorTotal(),
          status: 'pending',
          notes: observations + getObservationsDetails(), 
        }])
        .select()
        .single();
  

      if (saleError) throw saleError;

      // 2. Adicionar itens da venda
      const saleItems = cartItems.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        total_price: item.product.sale_price * item.quantity,
        is_composite: item.product.is_composition
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // 3. Se for entrega, adicionar informações de entrega
      if (saleType === 'delivery') {
        const { error: deliveryError } = await supabase
          .from('delivery_infos')
          .insert([{
            sale_id: sale.id,
            customer_name: deliveryInfo.customerName,
            customer_phone: deliveryInfo.customerPhone,
            delivery_date: `${deliveryInfo.deliveryDate}`,
            delivery_time: `${deliveryInfo.deliveryTime}`,
            cep: deliveryInfo.address.cep,
            street: deliveryInfo.address.street,
            number: deliveryInfo.address.number,
            complement: deliveryInfo.address.complement,
            neighborhood: deliveryInfo.address.neighborhood,
            city: deliveryInfo.address.city,
            uf: deliveryInfo.address.uf,
            additional_info: deliveryInfo.additionalInfo,
            from: deliveryInfo.from,
            to: deliveryInfo.to
          }]);

        if (deliveryError) throw deliveryError;
      }

      // 4. Redirecionar para tela de sucesso ou impressão
      router.push(`/dashboard/vendas/comprovante/${sale.id}`);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Ocorreu um erro ao finalizar a venda');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Finalizar Venda</h1>

        {/* Resumo da Venda com Toggle */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div 
            className="flex justify-between items-center cursor-pointer mb-2"
            onClick={() => setShowItems(!showItems)}
          >
            <h2 className="text-lg font-semibold">Resumo da Venda</h2>
            <svg
              className={`w-5 h-5 transform transition-transform ${showItems ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-sm text-gray-400">Total de Itens</p>
              <p className="text-xl font-bold">
                {cartItems.reduce((total, item) => total + item.quantity, 0)}
              </p>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-sm text-gray-400">Valor Total</p>
              <p className="text-xl font-bold text-blue-400">
                {formatarMoeda(calcularValorTotal())}
              </p>
            </div>
          </div>

          {showItems && (
          <div className="mt-4 space-y-3">
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                {/* Miniatura da imagem */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-600">
                  {item.product.image_url ? (
                    <img 
                      src={item.product.image_url} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Detalhes do produto */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product.name}</p>
                  <div className="flex items-center text-sm text-gray-400">
                    <span>{item.quantity}x</span>
                    <span>{item.product.sale_price.toFixed(2).toString().replace('.', ',')}</span>
                  </div>  
                </div>
                
                {/* Valor total do item */}
                <div className="text-blue-400 font-medium">
                  {formatarMoeda(item.product.sale_price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Tipo de Venda</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSaleType('pickup')}
              className={`p-4 rounded-lg border ${saleType === 'pickup' ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'}`}
            >
              Retirada no Local
            </button>
            <button
              onClick={() => setSaleType('delivery')}
              className={`p-4 rounded-lg border ${saleType === 'delivery' ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'}`}
            >
              Entrega
            </button>
          </div>
        </div>

        {saleType === 'delivery' && (
          <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Informações de Entrega</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome do Cliente</label>
              <input
                type="text"
                name="customerName"
                value={deliveryInfo.customerName}
                onChange={handleDeliveryInfoChange}
                className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Telefone</label>
              <IMaskInput
                mask="(00) 00000-0000"
                name="customerPhone"
                value={deliveryInfo.customerPhone}
                onAccept={(value) => setDeliveryInfo({...deliveryInfo, customerPhone: value})}
                className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                required
              />
            </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">De</label>
                <input
                  type="text"
                  name="from"
                  value={deliveryInfo.from}
                  onChange={handleDeliveryInfoChange}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Para</label>
                <input
                  type="text"
                  name="to"
                  value={deliveryInfo.to}
                  onChange={handleDeliveryInfoChange}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  min="06:00"
                  max="19:00"
                  required
                />
              </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data</label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={deliveryInfo.deliveryDate}
                  onChange={handleDeliveryInfoChange}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Hora</label>
                <input
                  type="time"
                  name="deliveryTime"
                  value={deliveryInfo.deliveryTime}
                  onChange={handleDeliveryInfoChange}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  min="06:00"
                  max="19:00"
                  required
                />
              </div>
            </div>
            
            {/* Campos de endereço */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">CEP</label>
                <IMaskInput
                  mask="00000-000"
                  name="address.cep"
                  value={deliveryInfo.address.cep}
                  onAccept={(value) => {
                    setDeliveryInfo(prev => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        cep: value
                      }
                    }));
                  }}
                  onBlur={handleCepBlur}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  required
                  disabled={isFetchingCep}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Número</label>
                <input
                  type="text"
                  name="address.number"
                  value={deliveryInfo.address.number}
                  onChange={handleDeliveryInfoChange}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Logradouro</label>
              <input
                type="text"
                name="address.street"
                value={deliveryInfo.address.street}
                onChange={handleDeliveryInfoChange}
                className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bairro</label>
                <input
                  type="text"
                  name="address.neighborhood"
                  value={deliveryInfo.address.neighborhood}
                  onChange={handleDeliveryInfoChange}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cidade</label>
                <input
                  type="text"
                  name="address.city"
                  value={deliveryInfo.address.city}
                  onChange={handleDeliveryInfoChange}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Complemento (Opcional)</label>
              <input
                type="text"
                name="address.complement"
                value={deliveryInfo.address.complement}
                onChange={handleDeliveryInfoChange}
                className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Informações Adicionais</label>
              <textarea
                name="additionalInfo"
                value={deliveryInfo.additionalInfo}
                onChange={handleDeliveryInfoChange}
                className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                rows={3}
              />
            </div>
          </div>
        </div>
        )}

<div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Método de Pagamento</h2>
            <div className="grid grid-cols-2 gap-4">
              {['cash', 'credit_card', 'debit_card', 'pix'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as 'cash' | 'credit_card' | 'debit_card' | 'pix')}
                  className={`p-4 rounded-lg border ${paymentMethod === method ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'}`}
                >
                  {method === 'cash' && 'Dinheiro'}
                  {method === 'credit_card' && 'Cartão de Crédito'}
                  {method === 'debit_card' && 'Cartão de Débito'}
                  {method === 'pix' && 'PIX'}
                </button>
              ))}
            </div>

            {/* Botões de Desconto e Acréscimo */}
            <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
              <button
                onClick={() => toggleAdjustment('discount')}
                className={`p-4 rounded-lg border flex items-center justify-center ${paymentDetails.showDiscount ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'}`}
              >
                <span>Desconto</span>
                <svg
                  className={`w-5 h-5 ml-2 transform transition-transform ${paymentDetails.showDiscount ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                onClick={() => toggleAdjustment('addition')}
                className={`p-4 rounded-lg border flex items-center justify-center ${paymentDetails.showAddition ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'}`}
              >
                <span>Acréscimo</span>
                <svg
                  className={`w-5 h-5 ml-2 transform transition-transform ${paymentDetails.showAddition ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Inputs de Desconto */}
            {paymentDetails.showDiscount && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                  <select
                    value={paymentDetails.discount.type}
                    onChange={(e) => handleAdjustmentChange('discount', 'type', e.target.value)}
                    className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  >
                    <option value="fixed">Valor Fixo</option>
                    <option value="percentage">Porcentagem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {paymentDetails.discount.type === 'percentage' ? 'Porcentagem (%)' : 'Valor (R$)'}
                  </label>
                  {paymentDetails.discount.type === 'percentage' ? (
                  <PercentageInput
                    value={paymentDetails.discount.value}
                    onChange={(value) => handleAdjustmentChange('discount', 'value', value)}
                    className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                    max={100}
                    decimalPlaces={2}
                  />
                ) : (
                  <CurrencyInput
                    value={paymentDetails.discount.value}
                    onChange={(value) => handleAdjustmentChange('discount', 'value', value)}
                    className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  />
                )}
                </div>
              </div>
            </div>
          )}

            {/* Inputs de Acréscimo */}
            {paymentDetails.showAddition && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                  <select
                    value={paymentDetails.addition.type}
                    onChange={(e) => handleAdjustmentChange('addition', 'type', e.target.value)}
                    className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  >
                    <option value="fixed">Valor Fixo</option>
                    <option value="percentage">Porcentagem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {paymentDetails.addition.type === 'percentage' ? 'Porcentagem (%)' : 'Valor (R$)'}
                  </label>
                  {paymentDetails.addition.type === 'percentage' ? (
                  <PercentageInput
                    value={paymentDetails.addition.value}
                    onChange={(value) => handleAdjustmentChange('addition', 'value', value)}
                    className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                    max={100}
                    decimalPlaces={2}
                  />
                ) : (
                  <CurrencyInput
                    value={paymentDetails.addition.value}
                    onChange={(value) => handleAdjustmentChange('addition', 'value', value)}
                    className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  />
                )}
                </div>
              </div>
            </div>
          )}

            {/* Observações*/}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Observações (Opcional)</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                rows={3}
                placeholder="Alguma observação importante sobre a venda..."
              />
            </div>

            {/* Resumo do Valor */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Subtotal:</span>
                <span>{formatarMoeda(cartItems.reduce((total, item) => total + (item.product.sale_price * item.quantity), 0))}</span>
              </div>

            {paymentDetails.discount.value > 0 && (
            <div className="flex justify-between items-center mb-2 text-red-400">
              <span>Desconto:</span>
              <span>-{formatarMoeda(
                paymentDetails.discount.type === 'percentage' 
                  ? (cartItems.reduce((total, item) => total + (item.product.sale_price * item.quantity), 0) * (paymentDetails.discount.value / 100))
                  : paymentDetails.discount.value
              )}</span>
            </div>
            )}

          {paymentDetails.addition.value > 0 && (
            <div className="flex justify-between items-center mb-2 text-green-400">
              <span>Acréscimo:</span>
              <span>+{formatarMoeda(
                paymentDetails.addition.type === 'percentage' 
                  ? (cartItems.reduce((total, item) => total + (item.product.sale_price * item.quantity), 0) * (paymentDetails.addition.value / 100))
                  : paymentDetails.addition.value
              )}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-xl text-green-400">{formatarMoeda(calcularValorTotal())}</span>
            </div>
          </div>

          {/* Valor em Dinheiro e Troco */}
          {paymentMethod === 'cash' && (
                <div className="bg-gray-800 p-4 rounded-lg mb-4 mt-4">
                <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valor Recebido</label>
                  <CurrencyInput
                  value={paymentDetails.cashAmount}
                  onChange={(value) => setPaymentDetails(prev => ({ ...prev, cashAmount: value }))}
                  className="w-full p-3 rounded border border-gray-600 focus:border-blue-500 bg-gray-800 text-white"
                  />
                </div>
                  <div>
                  <label className="block text-sm text-gray-400 mb-1">Troco (R$)</label>
                  <div className="w-full p-3 rounded border border-gray-600 bg-gray-700 text-white">
                    {formatarMoeda(calcularTroco())}
                  </div>
                  </div>
                </div>
                </div>
            )}
      
          </div>

        {/* Botão de Voltar */}
        <button
          onClick={() => router.push(`/dashboard/vendas?cart=${encodeURIComponent(JSON.stringify(cartItems))}`)}
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

        {/* Botão avançar */}
        <button
            onClick={handleSubmit}
            disabled={isSubmitting || (saleType === 'pickup' && !paymentMethod) || 
                     (saleType === 'delivery' && (!deliveryInfo.customerName || !deliveryInfo.address.cep || 
                      !deliveryInfo.address.street || !deliveryInfo.address.number || 
                      !deliveryInfo.address.neighborhood || !deliveryInfo.address.city))}
            className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700"
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
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
            </svg>
        </button>        
      </div>
    </div>
  );
}