import { signout } from '@/actions/auth'

export function SignOutButton() {
  return (
    <form action={signout}>
      <button
        type="submit"
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
