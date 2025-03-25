// src/app/dashboard/produtos/editar/[id]/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { formatarMoeda, formatarPorcentagem, parseMoeda, parseMoedaCalculoPorcentagem } from '@/utils/moeda';
import Select from 'react-select';
import PlaceholderImage from '../../../../../../components/PlaceholderImage';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { useLoading } from '@/contexts/loading-context';

interface Categoria {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  barcode: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  image_url: string | null;
  manages_stock: boolean;
  sell_online: boolean;
  quantity: number;
  is_composition: boolean;
}

interface ComponentProduct {
  product: Product;
  quantity: number;
}

export default function EditarProdutoPage() {
  const router = useRouter();
  const { id } = useParams(); // Obtém o ID do produto da URL
  const [nome, setNome] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [codigoBarras, setCodigoBarras] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [valorCompra, setValorCompra] = useState<string>('');
  const [porcentagemLucro, setPorcentagemLucro] = useState<string>('');
  const [valorVenda, setValorVenda] = useState<string>('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Categoria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const { isLoading, setLoading } = useLoading();
  const [imagens, setImagens] = useState<(File | null)[]>([null, null, null]);
  const [linksImagens, setLinksImagens] = useState<string[]>([]);
  const [managesStock, setManagesStock] = useState<boolean>(false);
  const [sellOnline, setSellOnline] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(0);
  const [abaAtiva, setAbaAtiva] = useState<'simples' | 'composto'>('simples');
  const [componentes, setComponentes] = useState<ComponentProduct[]>([]);
  const [valorVendaComposto, setValorVendaComposto] = useState<string>('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Product[]>([]);
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadComplete] = useState(false);
  const [isComposition, setComposition] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [mostrarScannerComposto, setMostrarScannerComposto] = useState(false);
  const scannerModalRef = useRef<{ stopScanner: () => void } | null>(null);


  // Função para buscar os dados do produto
  const fetchProduto = async () => {
    setLoading(true);
    try {
      // Busca o produto
      const { data: produto, error: produtoError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (produtoError) throw produtoError;

      // Preenche os campos com os dados do produto
      setNome(produto.name);
      setDescricao(produto.description);
      setCodigoBarras(produto.barcode);
      setSku(produto.sku);
      setValorCompra(formatarMoeda(produto.cost_price));
      setValorVenda(formatarMoeda(produto.sale_price));
      setPorcentagemLucro(getPorcentagemLucro(produto.cost_price, produto.sale_price));
      setManagesStock(produto.manages_stock);
      setSellOnline(produto.sell_online);
      setQuantity(produto.quantity);
      setComposition(produto.is_composition);
      setAbaAtiva(produto.is_composition ? 'composto' : 'simples');

      // Busca as imagens do produto
      const { data: imagensData, error: imagensError } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', id);

      if (imagensError) throw imagensError;

      setLinksImagens(imagensData.map((img) => img.image_url));

      setImagens(Array(3).fill(null));

      // Busca as categorias do produto
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('product_categories')
        .select('categories(id, name)')
        .eq('product_id', id);

      if (categoriasError) throw categoriasError;

      setCategoriasSelecionadas(categoriasData.map((item) => item.categories).flat());

      // Se for um produto composto, busca os componentes
      if (produto.is_composition) {
        const { data: componentesData, error: componentesError } = await supabase
          .from('product_components')
          .select('component_product_id, quantity')
          .eq('parent_product_id', id);

        if (componentesError) throw componentesError;

        const produtosComponentes = await Promise.all(
          componentesData.map(async (componente) => {
            // Busca o produto componente com suas imagens (limitando a 1 imagem por produto)
            const { data: produtoComponente, error: produtoError } = await supabase
              .from('products')
              .select(`
                *,
                product_images!inner(
                  image_url
                )
              `)
              .eq('id', componente.component_product_id)
              .limit(1, { foreignTable: 'product_images' }) // Limita a 1 imagem
              .single();

            if (produtoError) throw produtoError;

            // Extrai a primeira imagem (se existir)
            const image_url = produtoComponente.product_images?.[0]?.image_url || null;

            // Remove o array de product_images do objeto principal para manter a estrutura consistente
            const { ...produtoSemImagens } = produtoComponente;

            return { 
              product: {
                ...produtoSemImagens,
                image_url // Adiciona apenas a primeira imagem
              }, 
              quantity: componente.quantity 
            };
          })
        );

        setComponentes(produtosComponentes);
        calcularValorCompra(produtosComponentes);
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      alert('Erro ao carregar produto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduto();
    }
  }, [id]);

  // Função para salvar as alterações
  const salvarAlteracoes = async () => {
    setLoading(true);

    try {
      // Atualiza o produto
      const { error: produtoError } = await supabase
        .from('products')
        .update({
          name: nome,
          description: descricao,
          barcode: codigoBarras,
          sku: sku,
          cost_price: parseMoeda(valorCompra),
          sale_price: parseMoeda(valorVenda),
          manages_stock: managesStock,
          sell_online: sellOnline,
          quantity: quantity,
          is_composition: isComposition,
        })
        .eq('id', id);

      if (produtoError) throw produtoError;

      // Atualiza as categorias
      const { error: categoriasError } = await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', id);

      if (categoriasError) throw categoriasError;

      const categoriasParaSalvar = categoriasSelecionadas.map((categoria) => ({
        product_id: id,
        category_id: categoria.id,
      }));

      const { error: categoriasInsertError } = await supabase
        .from('product_categories')
        .insert(categoriasParaSalvar);

      if (categoriasInsertError) throw categoriasInsertError;

      // Atualiza as imagens (se necessário)
      for (const link of linksImagens) {
        if (link) {
          const { error: imagemError } = await supabase
            .from('product_images')
            .upsert([{ product_id: id, image_url: link }]);

          if (imagemError) throw imagemError;
        }
      }

      // Se for um produto composto, atualiza os componentes
      if (isComposition) {
        const { error: componentesError } = await supabase
          .from('product_components')
          .delete()
          .eq('parent_product_id', id); // Alterado de composite_product_id para parent_product_id

        if (componentesError) throw componentesError;

        const componentesParaSalvar = componentes.map((componente) => ({
          parent_product_id: id, // Alterado de composite_product_id para parent_product_id
          component_product_id: componente.product.id,
          quantity: componente.quantity,
        }));

        const { error: componentesInsertError } = await supabase
          .from('product_components')
          .insert(componentesParaSalvar);

        if (componentesInsertError) throw componentesInsertError;
      }

      alert('Produto atualizado com sucesso!');
      router.push('/dashboard/produtos');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      alert('Erro ao atualizar produto. Tente novamente.');
    } finally {
      setLoading(false);
    }

    const { error: deleteImagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', id);

      if (deleteImagesError) throw deleteImagesError;

      // Insere apenas as imagens que existem
      const imagensParaSalvar = linksImagens
        .filter(link => link) // Filtra apenas links não vazios
        .map(link => ({
          product_id: id,
          image_url: link
        }));

      if (imagensParaSalvar.length > 0) {
        const { error: imagensInsertError } = await supabase
          .from('product_images')
          .insert(imagensParaSalvar);

        if (imagensInsertError) throw imagensInsertError;
      }



  };
  
  // O restante do código (funções de cálculo, manipulação de imagens, etc.) pode ser reutilizado da tela de criação.  
    
    useEffect(() => {
      const fetchCategorias = async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('*');
  
        if (error) {
          console.error('Erro ao buscar categorias:', error);
        } else {
          setCategorias(data || []);
        }
      };
  
      fetchCategorias();
    }, []);
  
    const calcularValorVenda = (valorCompra: string, porcentagemLucro: string) => {
      const valorCompraNumerico = parseMoeda(valorCompra);
      const porcentagemNumerica = parseFloat(porcentagemLucro.replace(',', '.'));
      if (isNaN(valorCompraNumerico) || isNaN(porcentagemNumerica)) {
        setValorVenda('');
        return;
      }
  
      const lucro = valorCompraNumerico * (porcentagemNumerica / 100);
      const valorVendaCalculado = valorCompraNumerico + lucro;
      setValorVenda(formatarMoeda(valorVendaCalculado));
    };

    const getPorcentagemLucro = (valorCompra: string, valorVenda: string) => {
      const valorCompraNumerico = parseFloat(valorCompra);
      const valorVendaNumerico = parseFloat(valorVenda);

      if (isNaN(valorCompraNumerico) || isNaN(valorVendaNumerico)) {
        return '';
      }
  
      const lucro = valorVendaNumerico - valorCompraNumerico;
      const porcentagemLucroCalculada = ((lucro / valorCompraNumerico) * 100);
      return formatarPorcentagem(porcentagemLucroCalculada);
    };

    const calcularPorcentagemLucro = (valorVenda: string, valorCompra: string) => {
      const valorCompraNumerico = parseMoedaCalculoPorcentagem(valorCompra);
      const valorVendaNumerico = parseMoedaCalculoPorcentagem(valorVenda);
      if (isNaN(valorCompraNumerico) || isNaN(valorVendaNumerico)) {
        setPorcentagemLucro('');
        return;
      }
      const lucro = valorVendaNumerico - valorCompraNumerico;
      const porcentagemLucroCalculada = (lucro / valorCompraNumerico) * 100;
      setPorcentagemLucro(formatarPorcentagem(porcentagemLucroCalculada));
    }
  
    const handleImagemChange = async (index: number, file: File | null) => {
      const novosLinks = [...linksImagens];
      const novasImagens = [...imagens];
      
      if (file) {
        try {
          setIsUploading(true);
          // Inicializa o progresso
          const newProgress = [...uploadProgress];
          newProgress[index] = 0;
          setUploadProgress(newProgress);
    
          const formData = new FormData();
          formData.append("file", file);
    
          // Usando XMLHttpRequest para ter eventos de progresso
          const xhr = new XMLHttpRequest();
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) { // Verifica se total é válido
              const progress = Math.round((event.loaded * 100) / event.total);
              const newProgress = [...uploadProgress];
              newProgress[index] = progress;
              setUploadProgress(newProgress);
            }
          };
    
          const uploadPromise = new Promise((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
              } else {
                reject(new Error('Upload failed'));
              }
            };
            
            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.open('POST', '/api/upload');
            xhr.send(formData);
          });
    
          const data = await uploadPromise as { url: string };
    
          novosLinks[index] = data.url;
          novasImagens[index] = file;
    
        } catch (error) {
          console.error("Erro no upload:", error);
          alert("Erro ao enviar imagem. Tente novamente.");
        } finally {
          setIsUploading(false);
          // Reseta o progresso
          const newProgress = [...uploadProgress];
          newProgress[index] = 0;
          setUploadProgress(newProgress);
        }
      } else {
        // Remove a imagem
        novosLinks[index] = '';
        novasImagens[index] = null;
        const newProgress = [...uploadProgress];
        newProgress[index] = 0;
        setUploadProgress(newProgress);
      }
    
      setLinksImagens(novosLinks);
      setImagens(novasImagens);
    };
    
  const adicionarProduto = (produto: Product, quantidade: number) => {
    // Verifica se o produto já está na lista de componentes
    const produtoExistente = componentes.find((c) => c.product.id === produto.id);
  
    if (produtoExistente) {
      alert('Este produto já foi adicionado à composição.');
      return;
    }
  
    const novoComponente: ComponentProduct = { product: produto, quantity: quantidade };
    setComponentes([...componentes, novoComponente]);
    calcularValorCompra([...componentes, novoComponente]);
  };
    
  const calcularValorCompra = (componentes: ComponentProduct[]) => {
    const total = componentes.reduce((acc, componente) => {
      return acc + componente.product.cost_price * componente.quantity;
    }, 0);
    setValorVendaComposto(formatarMoeda(total)); // Atualiza o valor de venda do produto composto
  };
    
    const removerProduto = (id: string) => {
      const novosComponentes = componentes.filter((c) => c.product.id !== id);
      setComponentes(novosComponentes);
      calcularValorCompra(novosComponentes);
    };
  
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
          cost_price,
          sale_price,
          product_images (image_url)
        `)
        .or(`barcode.ilike.%${termo}%,sku.ilike.%${termo}%,description.ilike.%${termo}%`)
        .neq('is_composition', true)  // Adiciona a condição onde is_composition não é true
        .limit(1, { foreignTable: 'product_images' }); // Limita a uma imagem por produto
    
      if (error) {
        console.error('Erro ao buscar produtos:', error);
      } else {
        // Ajusta os dados para incluir a primeira imagem (se existir)
        const produtosComImagem = data.map((produto) => ({
          id: produto.id,
          name: produto.name,
          description: produto.description,
          barcode: produto.barcode,
          sku: produto.sku,
          cost_price: produto.cost_price,
          sale_price: produto.sale_price,
          image_url: produto.product_images[0]?.image_url || null, // Pega a primeira imagem ou null
          manages_stock: false, // Default value or fetch from API if available
          sell_online: false, // Default value or fetch from API if available
          quantity: 0, // Default value or fetch from API if available
          is_composition: false, // Default value or fetch from API if available
        }));
        setResultadosPesquisa(produtosComImagem);
      }
    };
  
    
    // Função para abrir a câmera e escanear o código de barras
    const abrirCameraParaScanner = () => {
      setMostrarScanner(true);
    };

    const handleScan = (result: string) => {
      setCodigoBarras(result);
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

    const abrirCameraParaScannerComposto = () => {
      setMostrarScannerComposto(true);
    };

    const handleScanComposto = (result: string) => {
      setTermoPesquisa(result);
      setMostrarScannerComposto(false);
    };

    const handleScannerErrorComposto = (error: string) => {
      console.error('Erro no scanner:', error);
    };

  return (
    <div className="min-h-screen p-6">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setAbaAtiva('simples')}
          className={`px-4 py-2 rounded-lg ${
            abaAtiva === 'simples' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Produto Simples
        </button>
        <button
          onClick={() => setAbaAtiva('composto')}
          className={`px-4 py-2 rounded-lg ${
            abaAtiva === 'composto' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Produto Composto
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6 text-white">Editar Produto</h1>

      {/* O restante do código (campos de formulário, botões, etc.) pode ser reutilizado da tela de criação. */}
      <div className="space-y-4">
        {/* Campo para upload de imagens */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Imagens do Produto</label>
          <div className="mt-2 flex gap-4 items-center">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="relative w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-400 rounded-lg cursor-pointer"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0] || null;
                      await handleImagemChange(index, file);
                    };
                    input.click();
                  }}
                >
                  {imagens[index] ? (
                    <img
                      src={URL.createObjectURL(imagens[index]!)}
                      alt={`Preview ${index}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : linksImagens[index] ? (
                    <img
                      src={linksImagens[index]}
                      alt={`Produto ${index}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-gray-400"
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
                  )}
                </div>
              ))}
              
              {/* Botão de lixeira ao lado do terceiro espaço */}
              {(imagens.some(img => img) || linksImagens.some(link => link)) && (
                <button
                  onClick={() => {
                    // Remove todas as imagens
                    setImagens([null, null, null]);
                    setLinksImagens(['', '', '']);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                  title="Remover todas as imagens"
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
        </div>

        {/* Barra de progresso */}
        {isUploading && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Enviando imagens...</span>
            <span>
              {Math.max(...uploadProgress.filter(p => !isNaN(p))) || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ 
                width: `${Math.max(...uploadProgress.filter(p => !isNaN(p))) || 0}%`,
              }}
            ></div>
          </div>
        </div>
      )}


        {uploadComplete && (
          <div className="mt-2 flex items-center text-green-500 text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Upload concluído com sucesso!
          </div>
        )}

        {/* Campo Categoria (Multiselect) */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Categorias</label>
          <Select
            isMulti
            options={categorias.map((categoria) => ({
              value: categoria.id,
              label: categoria.name,
            }))}
            value={categoriasSelecionadas.map((categoria) => ({
              value: categoria.id,
              label: categoria.name,
            }))}
            onChange={(selectedOptions) => {
              const novasCategorias = selectedOptions.map((option) => ({
                id: option.value,
                name: option.label,
              }));
              setCategoriasSelecionadas(novasCategorias);
            }}
            className="mt-1 text-black"
            classNamePrefix="select"
            styles={{
              control: (provided) => ({
                ...provided,
                backgroundColor: '#374151',
                borderColor: '#4B5563',
                color: '#FFFFFF',
              }),
              menu: (provided) => ({
                ...provided,
                backgroundColor: '#374151',
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected ? '#4B5563' : '#374151',
                color: '#FFFFFF',
                ':hover': {
                  backgroundColor: '#4B5563',
                },
              }),
              multiValue: (provided) => ({
                ...provided,
                backgroundColor: '#4B5563',
              }),
              multiValueLabel: (provided) => ({
                ...provided,
                color: '#FFFFFF',
              }),
              multiValueRemove: (provided) => ({
                ...provided,
                color: '#FFFFFF',
                ':hover': {
                  backgroundColor: '#EF4444',
                },
              }),
            }}
          />
        </div>

        {/* Campo Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
          />
        </div>

        {/* Campo Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
          />
        </div>

        {/* Campo Código de Barras */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Código de Barras</label>
          <div className="relative">
            <input
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onBlur={handleInputBlur}
              className="mt-1 block w-full p-2 pl-4 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
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
        </div>

        {/* Campo SKU */}
        <div>
          <label className="block text-sm font-medium text-gray-300">SKU</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)} // Permite edição manual
            className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
          />
        </div>

      {abaAtiva === 'composto' && (
        <>
          {/* Campo de Pesquisa e Adição de Produtos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300">Adicionar Produtos à Composição</label>
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder="Pesquisar"
                value={termoPesquisa}
                onChange={(e) => {
                  setTermoPesquisa(e.target.value);
                  buscarProdutos(e.target.value);
                }}
                onBlur={handleInputBlur}
                className="w-full p-2 pl-4 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
              />
              <button
                onClick={abrirCameraParaScannerComposto}
                className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-blue-500"
              >
                {/* Ícone de código de barras */}
                <svg
                  width="20"
                  height="20"
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
              <div className="mt-4 space-y-2">
                {resultadosPesquisa.map((produto) => (
                  <div
                    key={produto.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                    onClick={() => adicionarProduto(produto, 1)} // Adiciona o produto com quantidade 1
                  >
                    <div className="flex-1">
                      <p className="text-gray-300">{produto.description}</p>
                      <p className="text-sm text-gray-400">Código: {produto.barcode}</p>
                      <p className="text-sm text-gray-400">SKU: {produto.sku}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-700">
                      {produto.image_url ? (
                        <img
                          src={produto.image_url}
                          alt={produto.description}
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

            {/* Lista de Produtos da Composição */}
            <div className="mb-6">
              <br></br>
              <h2 className="text-lg font-semibold text-gray-300 mb-4">Produtos da Composição</h2>
              {componentes.map((componente) => (
                <div key={componente.product.id} className="flex justify-between items-center mb-2">
                  {/* Imagem redonda antes da descrição */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-700">
                      {componente.product.image_url ? (
                        <img
                          src={componente.product.image_url}
                          alt={componente.product.description}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlaceholderImage /> // Usa o SVG como placeholder
                      )}
                    </div>
                    <span className="text-gray-300">{componente.product.description}</span>
                  </div>

                  {/* Quantidade, valor e botão de remover */}
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={componente.quantity}
                      onChange={(e) => {
                        const novosComponentes = componentes.map((c) =>
                          c.product.id === componente.product.id
                            ? { ...c, quantity: Number(e.target.value) }
                            : c
                        );
                        setComponentes(novosComponentes);
                        calcularValorCompra(novosComponentes);
                      }}
                      className="w-20 p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
                    />
                    <span className="text-gray-300">
                      R$ {(componente.product.cost_price * componente.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removerProduto(componente.product.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Campo Valor de Compra (Produto Simples) */}
          {abaAtiva === 'simples' && (
            <div>
              <label className="block text-sm font-medium text-gray-300">Valor de Compra</label>
              <input
                type="text"
                value={valorCompra}
                onChange={(e) => {
                  setValorCompra(formatarMoeda(e.target.value));
                  calcularValorVenda(e.target.value, porcentagemLucro);
                }}
                className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
              />
            </div>
          )}

        {/* Campo Porcentagem de Lucro (Produto Simples) */}
        {abaAtiva === 'simples' && (
          <div>
            <label className="block text-sm font-medium text-gray-300">Porcentagem de Lucro (%)</label>
            <input
              type="text"
              value={porcentagemLucro}
              onChange={(e) => {
                setPorcentagemLucro(e.target.value);
                calcularValorVenda(valorCompra, e.target.value);
              }}
              className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
            />
          </div>
        )}

        {/* Campo Valor de Venda (Produto Simples) */}
        {abaAtiva === 'simples' && (
          <div>
            <label className="block text-sm font-medium text-gray-300">Valor de Venda</label>
            <input
              type="text"
              value={valorVenda}
              onChange={(e) => {
                calcularPorcentagemLucro(e.target.value, valorCompra);
                setValorVenda(formatarMoeda(e.target.value));
              }}
              className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
            />
          </div>
        )}

        {/* Campo Valor de Venda (Produto Composto) */}
        {abaAtiva === 'composto' && (
          <div>
            <label className="block text-sm font-medium text-gray-300">Valor de Venda</label>
            <input
              type="text"
              value={valorVendaComposto}
              onChange={(e) => {
                setValorVendaComposto(formatarMoeda(e.target.value));
              }}
              className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
            />
          </div>
        )}

        {/* Campos Controla Estoque e Vender Online (um ao lado do outro) */}
        <div className="flex justify-between">
          {/* Campo Controla Estoque */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={managesStock}
              onChange={(e) => setManagesStock(e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-300">Controla Estoque</label>
          </div>

          {/* Campo Vender Online */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={sellOnline}
              onChange={(e) => setSellOnline(e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-300">Vender Online</label>
          </div>
        </div>

        {/* Campo Quantidade */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Quantidade</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 block w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
          />
        </div>

       {/* Botão de Voltar no canto inferior esquerdo */}
      <button
        onClick={() => router.push('/dashboard/produtos')}
        className="fixed bottom-0 left-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
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

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={salvarAlteracoes}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>          

        {abaAtiva === 'simples' && (
          <div>
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
        )}

        {abaAtiva === 'composto' && (
          <div>
            {mostrarScannerComposto && (
            <BarcodeScannerModal
              ref={scannerModalRef}
                onScan={handleScanComposto}
                onError={handleScannerErrorComposto}
                onClose={() => {
                setMostrarScannerComposto(false);
                scannerModalRef.current?.stopScanner();
                }}
                />
          )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}