import { Link, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/login-form'
import { paths } from '../../../config/paths'

export const LoginPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex justify-center items-center py-12 px-4 min-h-[80vh]">
      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 sm:p-8 transition-colors">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl mb-1 text-[var(--text-primary)]">Đăng Nhập</h3>
          <p className="text-[var(--text-secondary)] text-xs">Chào mừng bạn quay trở lại với Novelis</p>
        </div>

        {/* Reusable Login Form */}
        <LoginForm onSuccess={() => navigate(paths.home.getHref())} />

        {/* Footer Link */}
        <div className="text-center mt-6 pt-4 border-t border-[var(--border-color)]">
          <span className="text-[var(--text-secondary)] text-xs">Chưa có tài khoản? </span>
          <Link to={paths.auth.register.getHref()} className="text-xs text-[var(--accent-gold)] hover:underline font-semibold">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
