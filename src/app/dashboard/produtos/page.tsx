// src/app/dashboard/produtos/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { formatarMoeda } from '@/utils/moeda';
import PlaceholderImage from '../../../../components/PlaceholderImage';
import { useLoading } from '@/contexts/loading-context';
import ConfirmationModal from '../../../../components/ConfirmationModal';
import { toast, ToastContainer } from 'react-toastify';
import Image from 'next/image';
interface Produto {
  id: string;
  name: string;
  description: string;
  sale_price: number;
  category_id: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  categorias?: Categoria[];
  active?: boolean;
  sell_online?: boolean;
  sell_shopee?: boolean;
  sell_mercado_livre?: boolean;
}

interface Categoria {
  id: string;
  name: string;
}

export default function ProdutosPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtroCategorias, setFiltroCategorias] = useState<string[]>([]);
  const [mostrarFiltro, setMostrarFiltro] = useState<boolean>(false);
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const scannerModalRef = useRef<{ stopScanner: () => void } | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const { setLoading } = useLoading();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtoToInactivate, setProdutoToInactivate] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState('');



  useEffect(() => {
    const fetchProdutos = async () => {
      console.log('Buscando produtos...');
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (!mostrarInativos) {
        query = query.eq('active', true);
      }

      const { data: produtosData, error: produtosError } = await query;

      if (produtosError) {
        console.error('Erro ao buscar produtos:', produtosError);
      } else {
        const produtosComImagensECategorias = await Promise.all(
          produtosData.map(async (produto) => {
            const { data: imagensData, error: imagensError } = await supabase
              .from('product_images')
              .select('image_url')
              .eq('product_id', produto.id)
              .limit(1);

            if (imagensError) {
              console.error('Erro ao buscar imagens:', imagensError);
            }

            const { data: categoriasData, error: categoriasError } = await supabase
              .from('product_categories')
              .select('categories(id, name)')
              .eq('product_id', produto.id);

            if (categoriasError) {
              console.error('Erro ao buscar categorias:', categoriasError);
            }

            return {
              ...produto,
              image_url: imagensData?.[0]?.image_url || null,
              categorias: categoriasData?.map((item) => item.categories) || [],
            };
          })
        );

        console.log('Produtos encontrados:', produtosComImagensECategorias);
        setProdutos(produtosComImagensECategorias);
        setLoading(false);
      }
    };

    const fetchCategorias = async () => {
      console.log('Buscando categorias...');
      const { data, error } = await supabase
        .from('categories')
        .select('*');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
      } else {
        console.log('Categorias encontradas:', data);
        setCategorias(data || []);
      }
    };

    fetchProdutos();
    fetchCategorias();
  }, [mostrarInativos]);

  useEffect(() => {
    return () => {
      console.log("Saindo da página, parando câmera...");
      scannerModalRef.current?.stopScanner();
    };
  }, []);



  const produtosFiltradosPorCategoria = filtroCategorias.length > 0
    ? produtos.filter((produto) =>
      produto.categorias?.some((categoria) => filtroCategorias.includes(categoria.id))
    )
    : produtos;

  const produtosFiltrados = termoPesquisa
    ? produtosFiltradosPorCategoria.filter((produto) =>
      produto.name.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
      produto.description.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
      produto.sku?.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
      produto.barcode?.toLowerCase().includes(termoPesquisa.toLowerCase())
    )
    : produtosFiltradosPorCategoria;

  const toggleCategoriaFiltro = (categoriaId: string) => {
    setFiltroCategorias((prev) =>
      prev.includes(categoriaId)
        ? prev.filter((id) => id !== categoriaId)
        : [...prev, categoriaId]
    );
  };

  const abrirCameraParaScanner = () => {
    setTermoPesquisa('');
    setMostrarScanner(true);
  };

  const handleScan = (result: string) => {
    setTimeout(() => {
      scannerModalRef.current?.stopScanner();
    }, 100);
    setTermoPesquisa(result);
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



  const openInactivationModal = (produtoId: string, isActive: boolean) => {
    setProdutoToInactivate(produtoId);
    setModalMessage(
      isActive
        ? 'Tem certeza que deseja inativar este produto?'
        : 'Tem certeza que deseja reativar este produto?'
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setProdutoToInactivate(null);
  };

  const handleInactivateProduto = async () => {
    if (!produtoToInactivate) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', produtoToInactivate);

      if (error) {
        toast.error('Erro ao atualizar status do produto: ' + error.message);
        throw error;
      } else {
        toast.success('Produto atualizado com sucesso!');
        setProdutos((prevProdutos) => prevProdutos.filter((produto) => produto.id !== produtoToInactivate));
      }
    } catch (error) {
      toast.error('Erro ao atualizar status do produto: ' + (error as Error).message);
    } finally {
      closeModal();
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6 text-white">Produtos</h1>

      {/* Container para o botão de filtro e o input de pesquisa */}
      <div className="flex flex-col justify-center items-center mb-6 space-y-4">

        {/* Input de pesquisa com ícone de leitor de código de barras */}
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar"
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
            onBlur={handleInputBlur}
            className="pl-4 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={abrirCameraParaScanner}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-blue-600"
          >
            {/* Ícone de código de barras */}
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

        {/* Botão de Filtro */}
        <div className="relative">
          <button
            onClick={() => setMostrarFiltro(!mostrarFiltro)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Filtrar por Categoria
          </button>
          {/* Adicione este botão junto com os outros controles de filtro */}
          <button
            onClick={() => setMostrarInativos(!mostrarInativos)}
            className={`px-4 py-2 rounded-lg ${mostrarInativos ? 'bg-red-600' : 'bg-gray-600'} text-white hover:bg-opacity-80 mr-2`}
          >
            {mostrarInativos ? 'Mostrar Ativos' : 'Mostrar Inativos'}
          </button>

          {/* Lista de Categorias (Filtro) */}
          {mostrarFiltro && (
            <div className="absolute mt-2 w-64 max-h-64 overflow-y-auto bg-white rounded-lg shadow-lg z-10">
              {categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => toggleCategoriaFiltro(categoria.id)}
                >
                  <input
                    type="checkbox"
                    checked={filtroCategorias.includes(categoria.id)}
                    readOnly
                    className="mr-2"
                  />
                  <span className="text-gray-800">{categoria.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="space-y-4">
        {produtosFiltrados.map((produto) => (
          <div
            key={produto.id}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 flex items-center"
            onClick={() => router.push(`/dashboard/produtos/editar/${produto.id}`)}
          >
            {!produto.active && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                Inativo
              </span>
            )}
            {/* Imagem do Produto (lado esquerdo) */}
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center border-2 mr-4">
              {produto.image_url ? (
                <img
                  src={produto.image_url}
                  alt={produto.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <PlaceholderImage />
              )}
            </div>

            {/* Informações do Produto */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800">{produto.name}</h2>
              <p className="text-gray-600">{produto.sku}</p>
              <p className="text-gray-600">{produto.barcode}</p>
              <p className="text-gray-600">{formatarMoeda(produto.sale_price.toFixed(2))}</p>

              {/* Badges de Categorias */}
              <div className="flex flex-wrap gap-2 mt-2">
                {produto.categorias?.map((categoria) => (
                  <span
                    key={categoria.id}
                    className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded"
                  >
                    {categoria.name}
                  </span>
                ))}
              </div>
              {/* Badges de Plataformas */}
              <div className="flex flex-wrap gap-2 mt-2">
                {produto.sell_online && (
                  <span className=" text-yellow-800 text-sm font-medium px-2 py-1 rounded flex items-center gap-1">
                    <Image
                      src="/icons/online.svg"
                      alt="Online"
                      width={35}
                      height={35}
                    />
                  </span>
                )}
                {produto.sell_shopee && (
                  <span className="text-orange-800 text-sm font-medium px-2 py-1 rounded flex items-center gap-1">
                    <Image
                      src="/icons/shopee.svg"
                      alt="Online"
                      width={35}
                      height={35}
                    />
                  </span>
                )}
                {produto.sell_mercado_livre && (
                  <span className="text-yellow-800 text-sm font-medium px-2 py-1 rounded flex items-center gap-1">
                    <Image
                      src="/icons/mercadolivre.svg"
                      alt="Online"
                      width={35}
                      height={35}
                    />
                  </span>
                )}
              </div>

            </div>

            {/* Ícone de Lixeira (lado direito) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openInactivationModal(produto.id, produto.active || false);
              }}
              className="text-red-500 hover:text-red-700 ml-4"
              title={produto.active ? 'Inativar Produto' : 'Produto Inativo'}
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
          </div>

        ))}
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

      {/* Botão Flutuante para Adicionar Novo Produto */}
      <button
        onClick={() => router.push('/dashboard/produtos/novo')}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

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

      {/* Modal de Confirmação */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={handleInactivateProduto}
        title="Confirmar Ação"
        message={modalMessage}
        confirmText="Inativar"
        cancelText="Cancelar"
      />

      <ToastContainer />
    </div>
  );
}