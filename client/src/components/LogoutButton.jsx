import { useLogout } from '../hooks/useLogout'

export default function LogoutButton({ className = '' }) {
  const { logout, isLoading } = useLogout()

  return (
    <button
      onClick={logout}
      disabled={isLoading}
      className={`text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}


