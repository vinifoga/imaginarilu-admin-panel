// src/app/dashboard/produtos/novo/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { formatarMoeda, parseMoeda } from '@/utils/moeda';
import Select from 'react-select';
import PlaceholderImage from '../../../../../components/PlaceholderImage';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';

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
  image_url: string | null; // Adicione este campo
}

interface ComponentProduct {
  product: Product;
  quantity: number;
}

export default function NovoProdutoPage() {
  const router = useRouter();
  const [nome, setNome] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [codigoBarras, setCodigoBarras] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [valorCompra, setValorCompra] = useState<string>('');
  const [porcentagemLucro, setPorcentagemLucro] = useState<string>('');
  const [valorVenda, setValorVenda] = useState<string>('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Categoria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [valorVendaEditavel, setValorVendaEditavel] = useState<boolean>(false);
  const [imagens, setImagens] = useState<(File | null)[]>([null, null, null]); // Array para 3 imagens
  const [linksImagens, setLinksImagens] = useState<string[]>([]);
  const [managesStock, setManagesStock] = useState<boolean>(false);
  const [sellOnline, setSellOnline] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(0);
  const [abaAtiva, setAbaAtiva] = useState<'simples' | 'composto'>('simples');
  const [componentes, setComponentes] = useState<ComponentProduct[]>([]);
  const [valorCompraComposto, setValorCompraComposto] = useState<number>(0);
  const [valorVendaComposto, setValorVendaComposto] = useState<string>('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Product[]>([]);
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const scannerModalRef = useRef<{ stopScanner: () => void } | null>(null);

  const gerarSku = (nome: string) => {
    const nomeAbreviado = nome.substring(0, 3).toUpperCase();
    const numeroAleatorio = Math.floor(Math.random() * 10000);
    return `${nomeAbreviado}-${numeroAleatorio}`;
  };

  useEffect(() => {
    if (nome) {
      setSku(gerarSku(nome));
    }
  }, [nome]);

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
    if (valorVendaEditavel) return;

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

  const handleImagemChange = async (index: number, file: File | null) => {
    if (!file) return;
  
    const formData = new FormData();
    formData.append("file", file);
  
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
  
    const data = await response.json();
  
    if (response.ok) {
      const novosLinks = [...linksImagens];
      novosLinks[index] = data.url;
      setLinksImagens(novosLinks);
  
      const novasImagens = [...imagens];
      novasImagens[index] = file;
      setImagens(novasImagens);
    } else {
      console.error("Erro ao fazer upload da imagem:", data.error);
    }
  };
  const salvarProduto = async () => {
  setLoading(true);

  if (!nome || !codigoBarras || !sku) {
    alert('Preencha todos os campos obrigatórios.');
    setLoading(false);
    return;
  }

  const verificarDuplicados = async (barcode: string, sku: string) => {
    const { data: barcodeExistente } = await supabase
      .from('products')
      .select('barcode')
      .eq('barcode', barcode)
      .single();

    const { data: skuExistente } = await supabase
      .from('products')
      .select('sku')
      .eq('sku', sku)
      .single();

    if (barcodeExistente || skuExistente) {
      if (barcodeExistente) {
        alert('Código de barras já existe.');
      }
      if (skuExistente) {
        alert('SKU já existe.');
      }
      return true;
    }

    return false;
  };

  const duplicado = await verificarDuplicados(codigoBarras, sku);
  if (duplicado) {
    setLoading(false);
    return;
  }

  try {
    // Salvar o produto
    const { data: produto, error: produtoError } = await supabase
      .from('products')
      .insert([
        {
          name: nome,
          description: descricao,
          barcode: codigoBarras,
          sku: sku,
          cost_price: abaAtiva === 'simples' ? parseMoeda(valorCompra) : valorCompraComposto,
          sale_price: abaAtiva === 'simples' ? parseMoeda(valorVenda) : parseMoeda(valorVendaComposto),
          manages_stock: managesStock,
          sell_online: sellOnline,
          quantity: quantity,
        },
      ])
      .select();

    if (produtoError) {
      console.error(produtoError);
      alert('Erro ao salvar produto. Tente novamente.');
      setLoading(false);
      return;
    }

    const produtoId = produto[0].id;

    // Salvar os links das imagens na tabela product_images
    for (const link of linksImagens) {
      if (link) {
        const { error: imagemError } = await supabase
          .from('product_images')
          .insert([{ product_id: produtoId, image_url: link }]);

        if (imagemError) {
          console.error('Erro ao salvar imagem:', imagemError);
        }
      }
    }

    // Salvar as categorias do produto
    const categoriasParaSalvar = categoriasSelecionadas.map((categoria) => ({
      product_id: produtoId,
      category_id: categoria.id,
    }));

    const { error: categoriasError } = await supabase
      .from('product_categories')
      .insert(categoriasParaSalvar);

    if (categoriasError) {
      console.error('Erro ao salvar categorias do produto:', categoriasError);
      alert('Erro ao salvar categorias do produto. Tente novamente.');
    } else {
      console.log('Produto, imagens e categorias salvas com sucesso!');
      router.push('/dashboard/produtos');
    }
  } catch (error) {
    console.error('Erro inesperado ao salvar produto:', error);
    alert('Erro inesperado ao salvar produto. Tente novamente.');
  } finally {
    setLoading(false);
  }
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
  setValorCompraComposto(total); // Atualiza o valor de compra do produto composto
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
      .limit(1, { foreignTable: 'product_images' }); // Limita a uma imagem por produto
  
    if (error) {
      console.error('Erro ao buscar produtos:', error);
    } else {
      // Ajusta os dados para incluir a primeira imagem (se existir)
      const produtosComImagem = data.map((produto) => ({
        ...produto,
        image_url: produto.product_images[0]?.image_url || null, // Pega a primeira imagem ou null
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
    if (scannerModalRef.current) {
      scannerModalRef.current.stopScanner();
    }
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
      <h1 className="text-2xl font-bold mb-6 text-white">Novo Produto</h1>

      <div className="space-y-4">
        {/* Campo para upload de imagens */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Imagens do Produto</label>
          <div className="mt-2 flex gap-4">
  {[0, 1, 2].map((index) => (
    <div
      key={index}
      className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-400 rounded-lg cursor-pointer"
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
</div>
        </div>

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
              onFocus={() => setCodigoBarras("")}
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
            <div className="mt-2 flex gap-4">
              <input
                type="text"
                placeholder="Pesquisar"
                value={termoPesquisa}
                onChange={(e) => {
                  setTermoPesquisa(e.target.value);
                  buscarProdutos(e.target.value);
                }}
                onBlur={handleInputBlur}
                className="flex-1 p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-700 text-white"
              />
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
                setValorVenda(formatarMoeda(e.target.value));
                setValorVendaEditavel(true);
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
            onClick={salvarProduto}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          {mostrarScanner && (
                  <BarcodeScannerModal
                    ref={scannerModalRef} // Passe a ref para o modal
                    onScan={handleScan}
                    onError={handleScannerError}
                    onClose={() => {
                      setMostrarScanner(false);
                      scannerModalRef.current?.stopScanner();
                    }}
                  />
                )}
        </div>
      </div>
    </div>
  );
}