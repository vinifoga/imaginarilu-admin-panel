// src/app/dashboard/vendas/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { formatarMoeda } from '@/utils/moeda';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import PlaceholderImage from '../../../../components/PlaceholderImage'; 
import { useSearchParams } from 'next/navigation';

interface Product {
    id: string;
    name: string;
    description: string;
    barcode: string;
    sku: string;
    sale_price: number;
    image_url: string | null;
  }

interface CartItem {
  product: Product;
  quantity: number;
}

export default function VendasPage() {
  const router = useRouter();
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const scannerModalRef = useRef<{ stopScanner: () => void } | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Carregar itens do carrinho dos query params ao voltar da conferência
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

  const buscarProdutos = async (termo: string) => {
    if (!termo) {
      setResultadosPesquisa([]);
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        barcode,
        sku,
        sale_price,
        product_images (image_url)
      `)
      .or(`barcode.ilike.%${termo}%,sku.ilike.%${termo}%,name.ilike.%${termo}%`)
      .limit(1, { foreignTable: 'product_images' });

    if (error) {
      console.error('Erro ao buscar produtos:', error);
    } else {
      const produtosComImagem = data.map((produto) => ({
        id: produto.id,
        name: produto.name,
        description: produto.description,
        barcode: produto.barcode,
        sku: produto.sku,
        sale_price: produto.sale_price,
        image_url: produto.product_images[0]?.image_url || null,
      }));
      setResultadosPesquisa(produtosComImagem);
    }
  };

  const removerDoCarrinho = (id: string) => {
    setCartItems(cartItems.filter((item) => item.product.id !== id));
  };

  const calcularValorTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product.sale_price * item.quantity);
    }, 0);
  };

  const abrirCameraParaScanner = () => {
    setMostrarScanner(true);
  };

  const handleScan = (result: string) => {
    setTimeout(() => {
      scannerModalRef.current?.stopScanner();
    }, 100);
    setTermoPesquisa(result);
    buscarProdutos(result);
    setMostrarScanner(false);
  };

  const handleScannerError = (error: string) => {
    console.error('Erro no scanner:', error);
  };

  const handleInputBlur = () => {
    if (scannerModalRef.current) {
      scannerModalRef.current.stopScanner();
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cartItems.find((item) => item.product.id === product.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      
      setCartItems(cartItems.map((item) =>
        item.product.id === product.id 
          ? { ...item, quantity: newQuantity } 
          : item
      ));
    } else {
      
      setCartItems([...cartItems, { product, quantity }]);
    }

    setTermoPesquisa('');
    setResultadosPesquisa([]);
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    const novosProdutos = cartItems.map((p) =>
      p.product.id === id ? { ...p, quantity: quantidade } : p
    );
    setCartItems(novosProdutos);
  };

  const limparCarrinho = () => {
    if (confirm('Tem certeza que deseja limpar todos os itens do carrinho?')) {
      setCartItems([]);
    }
  };

  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      alert('Adicione produtos ao carrinho antes de finalizar a venda');
      return;
    }
    router.push(`/dashboard/vendas/conferencia?cart=${encodeURIComponent(JSON.stringify(cartItems))}`);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Nova Venda</h1>
        {cartItems.length > 0 && (
            <button
            onClick={limparCarrinho}
            className="ml-2 text-red-500 hover:text-red-700 transition-colors"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
            </button>
        )}
        </div>

        {/* Campo de Pesquisa */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Consultar Produto
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Digite código de barras, SKU ou nome"
              value={termoPesquisa}
              onChange={(e) => {
                setTermoPesquisa(e.target.value);
                buscarProdutos(e.target.value);
              }}
              onBlur={handleInputBlur}
              className="w-full p-3 pl-4 pr-12 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 bg-gray-800 text-white"
            />
            <button
              onClick={abrirCameraParaScanner}
              className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-blue-500"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.4 3A1.4 1.4 0 0 0 3 4.4V6a1 1 0 0 1-2 0V4.4A3.4 3.4 0 0 1 4.4 1H6a1 1 0 0 1 0 2H4.4ZM17 2a1 1 0 0 1 1-1h1.6A3.4 3.4 0 0 1 23 4.4V6a1 1 0 1 1-2 0V4.4A1.4 1.4 0 0 0 19.6 3H18a1 1 0 0 1-1-1ZM2 17a1 1 0 0 1 1 1v1.6A1.4 1.4 0 0 0 4.4 21H6a1 1 0 1 1 0 2H4.4A3.4 3.4 0 0 1 1 19.6V18a1 1 0 0 1 1-1ZM22 17a1 1 0 0 1 1 1v1.6a3.4 3.4 0 0 1-3.4 3.4H18a1 1 0 1 1 0-2h1.6a1.4 1.4 0 0 0 1.4-1.4V18a1 1 0 0 1 1-1ZM18 8a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1ZM15 9a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0V9ZM10 8a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1ZM7 9a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0V9Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Resultados da busca */}
          {resultadosPesquisa.length > 0 && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {resultadosPesquisa.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex-1">
                    <p className="text-gray-300 font-medium">{product.name}</p>
                    <p className="text-sm text-blue-400">Preço: {formatarMoeda(product.sale_price)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gray-700">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <PlaceholderImage />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo da Venda */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
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
        </div>

        {/* Itens no Carrinho */}
        {cartItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-300 mb-2">Produtos no Carrinho</h2>
          {cartItems.map((item) => (
            <div
              key={item.product.id}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-700">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PlaceholderImage /> // Usa o SVG como placeholder
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-300">{item.product.name}</h3>
                    <p className="text-sm text-gray-400">SKU: {item.product.sku}</p>
                    <p className="text-sm text-gray-400">Código: {item.product.barcode}</p>
                  </div>
                </div>
                <button
                  onClick={() => removerDoCarrinho(item.product.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  Remover
                </button>
              </div>                 <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => atualizarQuantidade(item.product.id, Number(e.target.value))}
                    className="w-full p-2 rounded border border-gray-600 focus:border-blue-500 bg-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valor Unitário</label>
                  <div className="p-2 bg-gray-700 rounded text-white">
                    {formatarMoeda(item.product.sale_price)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valor Total</label>
                  <div className="p-2 bg-gray-700 rounded text-blue-400 font-medium">
                    {formatarMoeda(item.product.sale_price * item.quantity)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
       )}

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

        {/* Botão avançar */ }
        <button
            onClick={proceedToCheckout}
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

        {/* Modal do Scanner */}
        {mostrarScanner && (
          <BarcodeScannerModal
            ref={scannerModalRef}
            onScan={handleScan}
            onError={handleScannerError}
            onClose={() => setMostrarScanner(false)}
          />
        )}
      </div>
    </div>
  );
}