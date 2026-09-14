import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../context/AuthContext'
import type { User } from '../../../types'
import { paths } from '../../../config/paths'

export const GoogleOAuthCallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setAccessToken } = useAuth()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const userParam = searchParams.get('user')

    if (!accessToken || !userParam) {
      navigate(paths.auth.login.getHref(), { replace: true })
      return
    }

    let user: User | null = null
    try {
      user = JSON.parse(userParam) as User
    } catch {
      navigate(paths.auth.login.getHref(), { replace: true })
      return
    }

    queryClient.setQueryData(['auth-user'], user)
    setAccessToken(accessToken)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    navigate(paths.home.getHref(), { replace: true })
  }, [searchParams, navigate, queryClient, setAccessToken])

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="text-center text-[var(--text-secondary)] text-sm">
        Đang đăng nhập với Google...
      </div>
    </div>
  )
}

export default GoogleOAuthCallbackPage
