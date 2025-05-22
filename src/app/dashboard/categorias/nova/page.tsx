// src/app/dashboard/categorias/nova/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseCliente';
import LeftArrowIcon from '../../../../../components/LeftArrowIcon';
import SaveIcon from '../../../../../components/SaveIcon';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function NovaCategoriaPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!nome.trim()) {
      newErrors.nome = 'Nome da categoria é obrigatório';
      isValid = false;
    }

    setFieldErrors(newErrors);
    return isValid;
  };

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
      validateForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTouchedFields({ nome: true });

    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos obrigatórios', {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    const { error } = await supabase
      .from('categories')
      .insert([{ name: nome }]);

    if (error) {
      toast.error('Erro ao criar categoria: ' + error.message);
    } else {
      toast.success('Categoria criada com sucesso!');
      router.push('/dashboard/categorias');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6 text-white">Nova Categoria</h1>

      <form onSubmit={handleSubmit} noValidate> {/* Adicionado noValidate para desativar validação nativa */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 required-field">Nome</label>
          <input
            type="text"
            id="nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (submitted || touchedFields.nome) {
                validateForm();
              }
            }}
            onBlur={() => handleFieldBlur('nome')}
            className={`mt-1 block w-full p-2 rounded-lg border ${fieldErrors.nome && (touchedFields.nome || submitted)
                ? 'border-red-500'
                : 'border-gray-300 focus:border-blue-500'
              } bg-gray-700 text-white`}
          />
          {(fieldErrors.nome && (touchedFields.nome || submitted)) && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.nome}</p>
          )}
        </div>

        {/* Botão de Voltar no canto inferior esquerdo */}
        <button
          type="button"
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