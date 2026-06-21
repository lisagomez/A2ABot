import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const name =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'desarrollador'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Hola, {name} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Este es tu panel para supervisar los bots que construyes.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Aún no hay bots en tu pipeline. El siguiente paso será conectar tu bot
          de Telegram y empezar a construir con los agentes.
        </p>
      </div>
    </div>
  )
}
