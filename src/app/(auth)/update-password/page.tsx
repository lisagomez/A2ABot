import { UpdatePasswordForm } from '@/features/auth/components'

export default function UpdatePasswordPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Define una nueva contraseña
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Elige una contraseña segura para tu cuenta
        </p>
      </div>

      <UpdatePasswordForm />
    </div>
  )
}
