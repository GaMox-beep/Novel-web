import type { User } from '../../../context/AuthContext'

interface ProfileDetailsTabProps {
  user: User
  onLogout: () => void
}

export const ProfileDetailsTab = ({ user, onLogout }: ProfileDetailsTabProps) => {
  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3">
        Thông Tin Tài Khoản
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-color)]">
          <span className="block text-[var(--text-muted)] text-[11px] font-medium mb-0.5">Mã ID</span>
          <span className="font-mono text-xs text-[var(--text-primary)]">{user.id}</span>
        </div>
        <div className="p-3.5 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-color)]">
          <span className="block text-[var(--text-muted)] text-[11px] font-medium mb-0.5">Tên Người Dùng</span>
          <span className="text-xs font-semibold text-[var(--text-primary)]">{user.username}</span>
        </div>
        <div className="p-3.5 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-color)]">
          <span className="block text-[var(--text-muted)] text-[11px] font-medium mb-0.5">Email</span>
          <span className="text-xs text-[var(--text-primary)]">{user.email}</span>
        </div>
        <div className="p-3.5 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-color)]">
          <span className="block text-[var(--text-muted)] text-[11px] font-medium mb-0.5">Quyền Hạn</span>
          <span className="text-xs font-bold text-[var(--accent-gold)]">{user.role}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
        <button
          onClick={onLogout}
          className="px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg font-medium text-xs transition-colors"
        >
          Đăng Xuất
        </button>
      </div>
    </div>
  )
}

export default ProfileDetailsTab
