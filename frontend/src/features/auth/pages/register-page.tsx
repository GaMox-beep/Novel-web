import { Link, useNavigate } from 'react-router-dom'
import { RegisterForm } from '../components/register-form'
import { paths } from '../../../config/paths'

export const RegisterPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex justify-center items-center py-12 px-4 min-h-[85vh]">
      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 sm:p-8 transition-colors">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl mb-1 text-[var(--text-primary)]">Tạo Tài Khoản</h3>
          <p className="text-[var(--text-secondary)] text-xs">Đăng ký để lưu truyện yêu thích và tham gia bình luận</p>
        </div>

        {/* Reusable Register Form */}
        <RegisterForm onSuccess={() => navigate(paths.home.getHref())} />

        {/* Footer Link */}
        <div className="text-center mt-6 pt-4 border-t border-[var(--border-color)]">
          <span className="text-[var(--text-secondary)] text-xs">Đã có tài khoản? </span>
          <Link to={paths.auth.login.getHref()} className="text-xs text-[var(--accent-gold)] hover:underline font-semibold">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
