// src/app/dashboard/simulacao/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { formatarMoeda } from '@/utils/moeda';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import PlaceholderImage from '../../../../components/PlaceholderImage';

interface Product {
  id: string;
  name: string;
  description: string;
  barcode: string;
  sku: string;
  sale_price: number;
  image_url: string | null;
  is_composition?: boolean;
}

interface SimulatedProduct {
  product: Product;
  quantity: number;
  is_composition?: boolean;
}

export default function SimulacaoPage() {
  const router = useRouter();
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Product[]>([]);
  const [produtosSimulados, setProdutosSimulados] = useState<SimulatedProduct[]>([]);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const scannerModalRef = useRef<{ stopScanner: () => void } | null>(null);

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
        is_composition,
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
        is_composition: produto.is_composition,
      }));
      setResultadosPesquisa(produtosComImagem);
    }
  };

  const adicionarProdutoSimulacao = (produto: Product, quantidade: number = 1) => {
    // Verifica se o produto já está na simulação
    const produtoExistente = produtosSimulados.find((p) => p.product.id === produto.id);

    if (produtoExistente) {
      // Se já existe, apenas atualiza a quantidade
      const novosProdutos = produtosSimulados.map((p) =>
        p.product.id === produto.id ? { ...p, quantity: p.quantity + quantidade } : p
      );
      setProdutosSimulados(novosProdutos);
    } else {
      // Se não existe, adiciona novo produto
      setProdutosSimulados([...produtosSimulados, { product: produto, quantity: quantidade, is_composition: produto.is_composition }]);
    }

    // Limpa a pesquisa
    setTermoPesquisa('');
    setResultadosPesquisa([]);
  };

  const removerProdutoSimulacao = (id: string) => {
    setProdutosSimulados(produtosSimulados.filter((p) => p.product.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    const novosProdutos = produtosSimulados.map((p) =>
      p.product.id === id ? { ...p, quantity: quantidade } : p
    );
    setProdutosSimulados(novosProdutos);
  };

  const calcularValorTotal = () => {
    return produtosSimulados.reduce((total, item) => {
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

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Simulação de Preço
          </h1>
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

          {/* Lista de Resultados da Pesquisa */}
          {resultadosPesquisa.length > 0 && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {resultadosPesquisa.map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => adicionarProdutoSimulacao(produto)}
                >
                  <div className="flex-1">
                    <p className="text-gray-300 font-medium">{produto.name}</p>
                    <p className="text-sm text-gray-400">SKU: {produto.sku}</p>
                    <p className="text-sm text-gray-400">Código: {produto.barcode}</p>
                    <p className="text-sm text-blue-400">Valor: {formatarMoeda(produto.sale_price)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gray-700">
                    {produto.image_url ? (
                      <img
                        src={produto.image_url}
                        alt={produto.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                    <PlaceholderImage /> // Usa o SVG como placeholder
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo da Simulação */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-sm text-gray-400">Total de Itens</p>
              <p className="text-xl font-bold">
                {produtosSimulados.reduce((total, item) => total + item.quantity, 0)}
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

        {/* Lista de Produtos na Simulação */}
        {produtosSimulados.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-300 mb-2">Produtos na Simulação</h2>
            {produtosSimulados.map((item) => (
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
                    onClick={() => removerProdutoSimulacao(item.product.id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
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

      <div className="mb-20"></div>

      {/* Botão de Voltar no canto inferior esquerdo */}
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

      {produtosSimulados.length > 0 && (
      <>
        <button
          className="fixed bottom-6 right-25 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700"
          onClick={() => {
            // Lógica para criar orçamento
            const orcamentoData = {
              produtos: produtosSimulados,
              valorTotal: calcularValorTotal(),
              dataValidade: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 dias a partir de agora
            };
            localStorage.setItem('orcamentoAtual', JSON.stringify(orcamentoData));
            window.open('/dashboard/orcamento/impressao', '_blank');
          }}
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      </>
    )}

      {/* Botão para criar produto composto (opcional) */}
      {produtosSimulados.length > 0 && (
        <button
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
        onClick={async () => {
          // Buscar os preços de custo dos produtos selecionados
          const productIds = produtosSimulados.map(p => p.product.id);
          const { data: produtosCompletos, error } = await supabase
            .from('products')
            .select('id, cost_price')
            .in('id', productIds);
          
          if (error) {
            console.error('Erro ao buscar preços de custo:', error);
            return;
          }
          
          // Adicionar cost_price aos produtos simulados
          const produtosComCostPrice = produtosSimulados.map(item => {
            const produtoCompleto = produtosCompletos.find(p => p.id === item.product.id) || { cost_price: 0 };
            return {
              product: {
                ...item.product,
                cost_price: produtoCompleto.cost_price
              },
              quantity: item.quantity
            };
          });
          
          // Criar objeto com os dados completos
          const simulationData = {
            produtos: produtosComCostPrice,
            valorTotal: calcularValorTotal(),
            isComposition: true
          };
          
          // Codificar e redirecionar
          const encodedData = encodeURIComponent(JSON.stringify(simulationData));
          router.push(`/dashboard/produtos/novo?simulation=${encodedData}`);
        }}
      >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </button>
      )}
    </div>
  );
}