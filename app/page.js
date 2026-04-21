import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="home-hero">
      <div>
        <h1>Mon Herbier</h1>
        <p>
          Votre jardin botanique personnel : répertoriez vos plantes, consultez
          les fiches de culture, et diagnostiquez les maladies grâce au
          questionnaire de symptômes.
        </p>
        <div className="home-actions">
          <Link href="/signup" className="btn accent">Créer un compte</Link>
          <Link href="/login" className="btn">J'ai déjà un compte</Link>
        </div>
      </div>
    </div>
  );
}
