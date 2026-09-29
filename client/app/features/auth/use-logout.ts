import { useNavigate } from 'react-router'
import { api } from '~/lib/api'

export function useLogout() {
  const navigate = useNavigate()
  return async () => {
    await api.auth.logout.$post()
    navigate('/login', { replace: true })
  }
}
