export const AdminDashboardPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Bảng Điều Khiển Quản Trị</h3>
        <p className="text-[var(--text-secondary)] text-sm">Tổng quan thông số hệ thống Novelis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4">
          <span className="text-[var(--text-secondary)] text-xs">Tổng số truyện</span>
          <h4 className="text-2xl font-bold text-[var(--text-primary)] mt-1">128</h4>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4">
          <span className="text-[var(--text-secondary)] text-xs">Tổng số người dùng</span>
          <h4 className="text-2xl font-bold text-[var(--text-primary)] mt-1">1,450</h4>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4">
          <span className="text-[var(--text-secondary)] text-xs">Lượt đọc hôm nay</span>
          <h4 className="text-2xl font-bold text-[var(--accent-gold)] mt-1">24,500</h4>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4">
          <span className="text-[var(--text-secondary)] text-xs">Linh Thạch đã nạp</span>
          <h4 className="text-2xl font-bold text-[var(--accent-gold)] mt-1">89,000</h4>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 text-center">
        <p className="text-[var(--text-secondary)] text-sm mb-0">
          Các mô hình quản lý chi tiết (Truyện, User, Chương) sẽ được phát triển ở các bước tiếp theo.
        </p>
      </div>
    </div>
  )
}

export default AdminDashboardPage
