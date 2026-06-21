import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
        ✉️
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Revisa tu email
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta y
          entrar a tu panel.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-block text-sm font-medium text-gray-900 hover:underline"
      >
        Volver a iniciar sesión
      </Link>
    </div>
  )
}
