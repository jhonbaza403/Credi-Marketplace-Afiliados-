'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function CreateJobPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ejemplo de inserción en Supabase
    const { data, error } = await supabase
      .from('jobs')
      .insert([{ title: 'Nuevo Empleo', created_by: user?.id }]);

    if (error) {
      console.error('Error al crear el trabajo:', error.message);
      return;
    }

    console.log('Trabajo creado con éxito:', data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Tu formulario aquí */}
      <button type="submit">Crear Empleo</button>
    </form>
  );
}
