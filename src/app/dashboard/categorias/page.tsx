// src/app/dashboard/categorias/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import { useLoading } from '@/contexts/loading-context';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from '../../../../components/ConfirmationModal';

export default function CategoriasPage() {
  const router = useRouter();
  const { setLoading } = useLoading();
  interface Categoria {
    id: string;
    name: string;
  }

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategorias = async () => {
      console.log('Buscando categorias...');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
      } else {
        console.log('Categorias encontradas:', data);
        setCategorias(data || []);
      }
    };

    fetchCategorias();
  }, []);

  const openDeleteModal = (id: string) => {
    setCategoriaToDelete(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCategoriaToDelete(null);
  };

  const handleExcluirCategoria = async () => {
    if (!categoriaToDelete) return;

    try {
      const { error: relError } = await supabase
        .from('product_categories')
        .delete()
        .eq('category_id', categoriaToDelete);

      if (relError) throw relError;

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoriaToDelete);

      if (error) throw error;

      setCategorias(categorias.filter((categoria) => categoria.id !== categoriaToDelete));
      toast.success('Categoria excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir categoria: ' + (error as Error).message);
    } finally {
      closeModal();
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6 text-white">Categorias</h1>

      {/* Lista de Categorias */}
      <div className="space-y-4">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 flex justify-between items-center"
            onClick={() => {
              setLoading(true);
              router.push(`/dashboard/categorias/editar/${categoria.id}`);
            }}
          >
            <h2
              className="text-xl font-semibold text-gray-800"
            >
              {categoria.name}
            </h2>
            {/* Ícone de Lixeira para Excluir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(categoria.id);
              }}
              className="text-red-500 hover:text-red-700"
              aria-label="Excluir categoria"
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

      {/* Modal de Confirmação */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={handleExcluirCategoria}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta categoria?"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
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
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}