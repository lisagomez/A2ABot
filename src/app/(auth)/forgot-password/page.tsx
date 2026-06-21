import Link from 'next/link'
import { ForgotPasswordForm } from '@/features/auth/components'

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Recupera tu acceso
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-gray-900 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  )
}
