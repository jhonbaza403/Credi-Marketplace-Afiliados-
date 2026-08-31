import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()

  const { data: todos, error } = await supabase
    .from('todos')
    .select('id, name')

  if (error) {
    return <p className="text-red-500">Error al cargar los datos: {error.message}</p>
  }

  if (!todos || todos.length === 0) {
    return <p>No hay tareas registradas.</p>
  }

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  )
}
