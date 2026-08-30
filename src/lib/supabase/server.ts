import { createClient } from '@/lib/supabase/server';

export default async function ServerPage() {
  // Nota: En el servidor requiere 'await'
  const supabase = await createClient(); 
  
  const { data: jobs } = await supabase.from('jobs').select('*');

  return (
    <div>
      {jobs?.map((job) => (
        <p key={job.id}>{job.title}</p>
      ))}
    </div>
  );
}
