// src/app/dashboard/categorias/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';

export default function CategoriasPage() {
  const router = useRouter();
  interface Categoria {
    id: string;
    name: string;
  }

  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Busca as categorias do Supabase (só no cliente)
  useEffect(() => {
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

    fetchCategorias();
  }, []);

  // Função para excluir uma categoria
  const handleExcluirCategoria = async (id: string) => {
    const confirmacao = confirm('Tem certeza que deseja excluir esta categoria?');
    if (!confirmacao) return;

    // Remove os relacionamentos na tabela product_categories
    const { error: relError } = await supabase
      .from('product_categories')
      .delete()
      .eq('category_id', id);

    if (relError) {
      alert('Erro ao remover relacionamentos da categoria: ' + relError.message);
      return;
    }

    // Remove a categoria da tabela categories
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir categoria: ' + error.message);
    } else {
      // Atualiza a lista de categorias após a exclusão
      setCategorias(categorias.filter((categoria) => categoria.id !== id));
      alert('Categoria excluída com sucesso!');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Categorias</h1>
      {/* Lista de Categorias */}
      <div className="space-y-4">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 flex justify-between items-center"
          >
            <h2
              className="text-xl font-semibold text-gray-800"
              onClick={() => router.push(`/dashboard/categorias/editar/${categoria.id}`)}
            >
              {categoria.name}
            </h2>
            {/* Ícone de Lixeira para Excluir */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Evita que o clique propague para o div pai
                handleExcluirCategoria(categoria.id);
              }}
              className="text-red-500 hover:text-red-700"
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

      {/* Botão Flutuante para Adicionar Nova Categoria */}
      <button
        onClick={() => router.push('/dashboard/categorias/nova')}
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
    </div>
  );
}