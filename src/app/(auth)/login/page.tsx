import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from '@/features/auth/components'

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Accede a tu panel para supervisar tus bots
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="text-center text-sm text-gray-500">
        ¿Aún no tienes cuenta?{' '}
        <Link href="/signup" className="font-medium text-gray-900 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}
