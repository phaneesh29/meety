import { useLogout } from '../hooks/useLogout'

export default function LogoutButton({ className = '' }) {
  const { logout, isLoading } = useLogout()

  return (
    <button
      onClick={logout}
      disabled={isLoading}
      className={`text-sm font-medium text-slate-600 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
