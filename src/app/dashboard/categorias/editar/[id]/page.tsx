// src/app/dashboard/categorias/editar/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';

export default function EditarCategoriaPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.id as string;

  const [nome, setNome] = useState('');

  // Busca os dados da categoria
  useEffect(() => {
    const fetchCategoria = async () => {
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
    };

    fetchCategoria();
  }, [categoriaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
  };

  return (
    <div className="min-h-screen p-6">
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

        <div className="flex space-x-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/categorias')}
            className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}