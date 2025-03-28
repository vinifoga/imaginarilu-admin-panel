'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { formatarMoeda } from '@/utils/moeda';
import { FiPackage, FiSearch } from 'react-icons/fi';
import { useLoading } from '@/contexts/loading-context';

interface Produto {
  id: string;
  name: string;
  description: string;
  sale_price: number;
  sku?: string;
  barcode?: string;
  image_url?: string;
  is_composition?: boolean;
}

interface ComponenteProduto {
  component_product_id: string;
  quantity: number;
  product?: Produto;
}

export default function ConsultaPrecoPage() {
  const router = useRouter();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [produtosEncontrados, setProdutosEncontrados] = useState<Produto[]>([]);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerModalRef = useRef<{ stopScanner: () => void } | null>(null);
  const [mostrarDescricao, setMostrarDescricao] = useState(false);
  const [mostrarComponentes, setMostrarComponentes] = useState(false);
  const [componentes, setComponentes] = useState<ComponenteProduto[]>([]);
  const [carregandoComponentes, setCarregandoComponentes] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const { setLoading } = useLoading();

  const buscarProdutos = async (termo: string) => {
    try {
      setLoading(true);
      setError(null);
      setProduto(null);
      setProdutosEncontrados([]);

      // Se o termo parece ser um código de barras (apenas números)
      if (/^\d+$/.test(termo)) {
        console.log(termo)
        const { data: produtoData, error: produtoError } = await supabase
          .from('products')
          .select('*')
          .or(`barcode.eq.${termo},sku.eq.${termo}`)
          .limit(1);

        if (!produtoError && produtoData && produtoData.length > 0) {
          await carregarDetalhesProduto(produtoData[0]);
          return;
        }
      }

      // Busca mais ampla por nome, descrição, SKU ou código de barras
      const { data: produtosData, error: produtosError } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${termo}%,description.ilike.%${termo}%,sku.ilike.%${termo}%,barcode.ilike.%${termo}%`);

      if (produtosError || !produtosData || produtosData.length === 0) {
        throw new Error('Nenhum produto encontrado');
      }

      // Se encontrou apenas um produto, mostra diretamente
      if (produtosData.length === 1) {
        await carregarDetalhesProduto(produtosData[0]);
      } else {
        // Se encontrou vários, mostra a lista
        const produtosComImagens = await Promise.all(
          produtosData.map(async (produto) => {
            const { data: imagemData } = await supabase
              .from('product_images')
              .select('image_url')
              .eq('product_id', produto.id)
              .limit(1);

            return {
              ...produto,
              image_url: imagemData?.[0]?.image_url || null
            };
          })
        );
        setProdutosEncontrados(produtosComImagens);
      }
    } catch {
      setError('Nenhum produto encontrado');
      setProdutosEncontrados([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhesProduto = async (produtoData: Produto) => {
    const { data: imagemData } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', produtoData.id)
      .limit(1);

    const produtoCompleto = {
      ...produtoData,
      image_url: imagemData?.[0]?.image_url || null
    };

    setProduto(produtoCompleto);
    setProdutosEncontrados([]);

    // Se for uma composição, carrega os componentes
    if (produtoData.is_composition) {
      await carregarComponentes(produtoData.id);
    }
  };

  const carregarComponentes = async (produtoId: string) => {
    try {
      setCarregandoComponentes(true);
      
      // Busca os componentes do produto
      const { data: componentesData, error } = await supabase
        .from('product_components')
        .select('component_product_id, quantity')
        .eq('parent_product_id', produtoId);

      if (error) throw error;

      // Para cada componente, busca os detalhes do produto
      const componentesComDetalhes = await Promise.all(
        componentesData.map(async (componente) => {
          const { data: produtoData } = await supabase
            .from('products')
            .select('*')
            .eq('id', componente.component_product_id)
            .single();

          return {
            ...componente,
            product: produtoData
          };
        })
      );

      setComponentes(componentesComDetalhes);
    } catch (error) {
      console.error('Erro ao carregar componentes:', error);
    } finally {
      setCarregandoComponentes(false);
    }
  };

  const handleScan = (result: string) => {
    setMostrarScanner(false);
    setTermoPesquisa(result);
    buscarProdutos(result);
  };

  const handleScannerError = (error: string) => {
    console.error('Erro no scanner:', error);
    setError('Erro ao ler código de barras');
    setMostrarScanner(false);
  };

  const resetarConsulta = () => {
    setProduto(null);
    setProdutosEncontrados([]);
    setError(null);
    setTermoPesquisa('');
    setComponentes([]);
    setMostrarDescricao(false);
    setMostrarComponentes(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (termoPesquisa.trim()) {
      buscarProdutos(termoPesquisa.trim());
    }
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Consulta de Preço</h1>
      
      {/* Formulário de pesquisa */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Digite nome, SKU ou código de barras"
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              type="button"
              onClick={() => setMostrarScanner(true)}
              className="px-3 text-gray-500 hover:text-blue-600"
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
        </div>
      </form>

      <div className="space-y-4">
        {/* Exibe o produto encontrado */}
        {produto ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              {produto.image_url ? (
                <img
                  src={produto.image_url}
                  alt={produto.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400">
                  <FiPackage size={64} />
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              <h2 className="text-xl font-bold text-gray-800">{produto.name}</h2>              
              <div className="flex justify-between">
                {produto.description && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setMostrarDescricao(!mostrarDescricao)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {mostrarDescricao ? 'Ocultar descrição' : 'Mostrar descrição'}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 transition-transform ${mostrarDescricao ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {mostrarDescricao && (
                      <p className="text-gray-600 text-sm">{produto.description}</p>
                    )}
                  </div>
                )}

                {produto.is_composition && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setMostrarComponentes(!mostrarComponentes)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {mostrarComponentes ? 'Ocultar componentes' : 'Mostrar componentes'}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 transition-transform ${mostrarComponentes ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    
                    {mostrarComponentes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        {carregandoComponentes ? (
                          <p className="text-gray-500 text-sm">Carregando componentes...</p>
                        ) : componentes.length > 0 ? (
                          <ul className="space-y-3">
                            {componentes.map((componente, index) => (
                              <li key={index} className="border-b border-gray-200 pb-2 last:border-0">
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex justify-start space-x-2">
                                        <div>
                                        <p className="text-gray-800 text-sm">{componente.quantity || 0}x</p>
                                        </div>
                                        <div>
                                        <p className="text-gray-800 text-sm">{componente.product?.name || 'Produto não encontrado'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">
                                        {componente.product ? formatarMoeda((componente.quantity * componente.product.sale_price).toFixed(2)) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                              </li>
                            ))}
                            <div className="mt-4 flex justify-between">
                              <label className="block text-sm font-medium text-gray-300">
                                {componentes.reduce((acc, componente) => acc + componente.quantity, 0)} itens
                              </label>
                              <label className="block text-sm font-medium text-gray-300">
                                {(() => {
                                  const total = componentes.reduce((acc, componente) => {
                                    if (componente.product) {
                                      return acc + (componente.product.sale_price * componente.quantity);
                                    }
                                    return acc;
                                  }, 0);
                                  return formatarMoeda(total);
                                })()}
                              </label>
                            </div>
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-sm">Nenhum componente encontrado</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">SKU</p>
                  <p className="font-medium text-gray-800">{produto.sku || 'Sem SKU cadastrado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Código de Barras</p>
                  <p className="font-medium text-gray-800">{produto.barcode || 'Sem código de barras'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Preço</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatarMoeda(produto.sale_price.toFixed(2))}
                </p>
              </div>
            </div>
          </div>
        ) : produtosEncontrados.length > 0 ? (
          // Lista de produtos encontrados na pesquisa
          <div className="space-y-4">
            {produtosEncontrados.map((produto) => (
              <div
                key={produto.id}
                className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 flex items-center"
                onClick={() => carregarDetalhesProduto(produto)}
              >
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                  {produto.image_url ? (
                    <img
                      src={produto.image_url}
                      alt={produto.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <FiPackage size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{produto.name}</h4>
                  <p className="text-sm text-gray-600">{produto.sku || 'Sem SKU'}</p>
                  <p className="text-sm text-gray-600">{produto.barcode || 'Sem código de barras'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {formatarMoeda(produto.sale_price.toFixed(2))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={resetarConsulta}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 mx-auto"
            >
              <FiSearch size={20} /> Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-500">Digite um termo de pesquisa ou escaneie um código de barras</p>
          </div>
        )}
      </div>

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

      {/* Modal do Scanner */}
      {mostrarScanner && (
        <BarcodeScannerModal
          ref={scannerModalRef}
          onScan={handleScan}
          onError={handleScannerError}
          onClose={() => {
            setMostrarScanner(false);
          }}
        />
      )}
    </div>
  );
}