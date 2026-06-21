import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white">
        A2
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
        A2ABot
      </h1>
      <p className="mt-3 max-w-md text-gray-500">
        Construye, supervisa y vende bots conversacionales sin reconstruir la
        infraestructura en cada proyecto.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Iniciar sesión
        </Link>
      </div>
    </main>
  )
}
