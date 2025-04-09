// src/app/dashboard/orcamento/impressao/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { formatarMoeda } from '@/utils/moeda';
import { formatarData } from '@/utils/formatters';
import { supabase } from '@/lib/supabaseCliente';
import PrintIcon from '../../../../../components/PrintIcon';

interface OrcamentoProduto {
  product: {
    id: string;
    name: string;
    sale_price: number;
    image_url: string | null;
    is_composition?: boolean;
  };
  quantity: number;
}

interface OrcamentoData {
  produtos: OrcamentoProduto[];
  valorTotal: number;
  dataValidade: string;
  isComposition?: boolean;
}

interface ProductComponent {
  component_product_id: string;
  quantity: number;
  component_product: {
    name: string;
    sale_price: number;
  };
}

export default function ImpressaoOrcamento() {
  const [orcamento, setOrcamento] = useState<OrcamentoData | null>(null);
  const [componentes, setComponentes] = useState<Record<string, ProductComponent[]>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    console.log('Iniciando carregamento do orçamento...');
    
    const carregarOrcamento = async () => {
      try {
        // 1. Carregar dados do localStorage
        const orcamentoSalvo = localStorage.getItem('orcamentoAtual');
        if (!orcamentoSalvo) {
          console.error('Nenhum orçamento encontrado no localStorage');
          setStatus('error');
          return;
        }

        console.log('Dados do localStorage:', orcamentoSalvo);
        
        const parsedOrcamento = JSON.parse(orcamentoSalvo) as OrcamentoData;
        setOrcamento(parsedOrcamento);
        console.log('Orçamento parseado:', parsedOrcamento);

        // 2. Verificar se há produtos compostos
        const produtosCompostos = parsedOrcamento.produtos.filter(
          p => p.product.is_composition
        );

        console.log("parsedOrcamento", parsedOrcamento)

        console.log('Produtos compostos encontrados:', produtosCompostos.length);

        if (produtosCompostos.length > 0) {
            console.log('Iniciando busca de componentes...');
            const componentesMap: Record<string, ProductComponent[]> = {};
          
            for (const produto of produtosCompostos) {
              console.log(`Buscando componentes para produto ${produto.product.id}...`);
              const { data, error } = await supabase
                .from('product_components')
                .select(`
                  component_product_id, 
                  quantity,
                  component_product:component_product_id (name, sale_price)
                `)
                .eq('parent_product_id', produto.product.id);
          
              if (error) {
                console.error(`Erro ao buscar componentes para produto ${produto.product.id}:`, error);
                continue;
              }
          
              console.log(`Componentes encontrados para ${produto.product.id}:`, data);
              componentesMap[produto.product.id] = data as unknown as ProductComponent[];
            }
          
            setComponentes(componentesMap);
            console.log('Todos componentes carregados:', componentesMap);
          }

        setStatus('ready');
        console.log('Todos dados carregados com sucesso!');

      } catch (error) {
        console.error('Erro ao carregar orçamento:', error);
        setStatus('error');
      }
    };

    carregarOrcamento();
  }, []);

  useEffect(() => {
    if (status === 'ready') {
      console.log('Dados prontos, preparando para imprimir...');
      // Adicionamos um pequeno delay para garantir que o DOM esteja atualizado
      const timer = setTimeout(() => {
        console.log('Executando impressão...');
        window.print();
        // Fechar a janela após um pequeno delay
        setTimeout(() => {
          console.log('Fechando janela...');
          // window.close();
        }, 1000);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <p>Carregando orçamento...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <p className="text-red-500">Erro ao carregar o orçamento. Verifique o console para mais detalhes.</p>
      </div>
    );
  }

  console.log('Renderizando conteúdo para impressão...');
  console.log('Orçamento:', orcamento);
  console.log('Componentes:', componentes);

  return (
    <div className="min-h-screen p-2 md:p-6 bg-gray-900 text-white print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto print:max-w-none">
        <div className="thermal-receipt bg-white p-4 md:p-8 rounded-lg shadow-lg print:shadow-none print:p-0 print:rounded-none">
          {/* Cabeçalho */}
          <div className="flex flex-col items-center mb-4 print:mb-2">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 print:text-sm print:font-normal">
              Orçamento #{Math.random().toString(36).substring(2, 10).toUpperCase()}
            </h1>
            <p className="text-gray-600 text-xs md:text-sm print:text-xs">
              {formatarData(new Date().toISOString())}
            </p>
            <p className="text-red-600 text-sm font-bold mt-1">
              Válido até: {formatarData(orcamento?.dataValidade || new Date().toISOString())}
            </p>
          </div>

          {/* Itens do orçamento */}
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
                {orcamento?.produtos.map((item, index) => (
                    <React.Fragment key={`produto-${item.product.id}`}>
                    <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} print:!bg-transparent`}>
                        <td className="px-2 py-1 md:px-4 md:py-2 print:py-0 print:border-none">
                        <div className="flex items-center gap-1 print:gap-0">
                            <span className="text-sm md:text-base text-gray-700 print:text-xs print:font-bold">
                            {item.quantity}x {item.product.name}
                            {item.product.is_composition && " (Composto)"}
                            </span>
                        </div>
                        </td>
                        <td className="px-2 py-1 md:px-4 md:py-2 text-right text-gray-500 text-sm print:hidden">
                        {formatarMoeda(item.product.sale_price)}
                        </td>
                        <td className="px-2 py-1 md:px-4 md:py-2 text-right text-gray-700 font-medium text-sm print:text-xs print:py-0 print:border-none">
                        {formatarMoeda(item.product.sale_price * item.quantity)}
                        </td>
                    </tr>
                    {/* Mostrar componentes se for um produto composto */}
                    {item.product.is_composition && componentes[item.product.id]?.map((componente) => (
                    <tr key={`${item.product.id}-comp-${componente.component_product_id}`} className="print:!bg-transparent">
                      <td className="px-2 py-1 md:px-4 md:py-2 pl-8 print:pl-4 print:py-0 print:border-none">
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 print:text-[0.65rem]">
                            {componente.quantity}x {componente.component_product.name}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                    </React.Fragment>
                ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="mb-4 print:mb-2">            
            <div className="bg-gray-50 p-2 rounded-lg print:bg-transparent print:p-0 print:border-t print:border-b print:border-gray-300 print:py-1">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-bold pt-1 border-t text-gray-700 print:border-t-0">
                  <span>TOTAL:</span>
                  <span>{formatarMoeda(orcamento?.valorTotal || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center text-xs text-gray-500 mt-4">
            <p>Obrigado pela preferência!</p>
            <p>Este orçamento tem validade de 3 dias</p>
            <p>Valores somente para retirada na loja</p>
          </div>
        </div>
      </div>
      <button
        onClick={() => window.print()}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700">
        <PrintIcon />
      </button>
    </div>
  );
}