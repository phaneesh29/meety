import { useState } from 'react'
import { useClerk } from '@clerk/react'
import { useNavigate } from 'react-router-dom'

export function useLogout() {
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const logout = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await signOut()
      navigate('/sign-in', { replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  return { logout, isLoading }
}
