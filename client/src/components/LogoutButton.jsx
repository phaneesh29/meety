import { useLogout } from '../hooks/useLogout'

export default function LogoutButton({ className = '' }) {
  const { logout, isLoading } = useLogout()

  return (
    <button
      onClick={logout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
