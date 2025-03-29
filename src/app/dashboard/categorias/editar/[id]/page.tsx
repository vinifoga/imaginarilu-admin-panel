// src/app/dashboard/categorias/editar/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { useLoading } from '@/contexts/loading-context';

export default function EditarCategoriaPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.id as string;
  const { setLoading } = useLoading(); // Obtenha a função setLoading do hook

  const [nome, setNome] = useState('');

  // Busca os dados da categoria
  useEffect(() => {
    const fetchCategoria = async () => {
      setLoading(true); // Ativa o loading antes de iniciar a busca
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoriaId)
          .single();

        if (error) {
          console.error('Erro ao buscar categoria:', error);
        } else {
          setNome(data.name);
        }
      } finally {
        setLoading(false); // Desativa o loading após a conclusão (sucesso ou erro)
      }
    };

    fetchCategoria();
  }, [categoriaId, setLoading]); // Adicione setLoading às dependências

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Ativa o loading antes de iniciar a atualização
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: nome })
        .eq('id', categoriaId);

      if (error) {
        alert('Erro ao atualizar categoria: ' + error.message);
      } else {
        alert('Categoria atualizada com sucesso!');
        router.push('/dashboard/categorias');
      }
    } finally {
      setLoading(false); // Desativa o loading após a conclusão
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6 text-white">Editar Categoria</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="nome">
            Nome
          </label>
          <input
            type="text"
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-gray-800"
            required
          />
        </div>
              {/* Botão Flutuante voltar */}
              <button
                type="submit"
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
                  />
                </svg>
              </button>
      </form>
      {/* Botão de Voltar no canto inferior esquerdo */}
      <button
                onClick={() => router.push('/dashboard/categorias')}
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
    </div>
  );
}