import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: plants } = await supabase
    .from('plants')
    .select('*')
    .order('created_at', { ascending: false });

  return <DashboardClient initialPlants={plants || []} userEmail={user.email} />;
}
