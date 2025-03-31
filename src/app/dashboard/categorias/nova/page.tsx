// src/app/dashboard/categorias/nova/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import LeftArrowIcon from '../../../../../components/LeftArrowIcon';
import SaveIcon from '../../../../../components/SaveIcon';

export default function NovaCategoriaPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('categories')
      .insert([{ name: nome }]);

    if (error) {
      alert('Erro ao criar categoria: ' + error.message);
    } else {
      alert('Categoria criada com sucesso!');
      router.push('/dashboard/categorias');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6 text-white">Nova Categoria</h1>

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
            className="w-full px-3 py-2 border rounded-lg  text-gray-800"
            required
          />
        </div>

          {/* Botão de Voltar no canto inferior esquerdo */}
          <button
            onClick={() => router.push('/dashboard/categorias')}
            className="fixed bottom-6 left-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
          >
            <LeftArrowIcon />
          </button>

          {/* Botão Flutuante para salvar edições */}
          <button
            type="submit"            
            className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
          >
            <SaveIcon />
          </button>


        
      </form>
    </div>
  );
}