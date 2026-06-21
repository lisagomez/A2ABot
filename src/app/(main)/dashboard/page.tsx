import { createClient } from '@/lib/supabase/server'
import { DashboardHome } from '@/features/dashboard/components/DashboardHome'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nombre =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'desarrollador'

  return <DashboardHome userId={user!.id} nombre={nombre} />
}
