import { useCategoryAdmin } from '../../categories/hooks/use-category-admin'
import { CategoryTableRow } from '../../categories/components/category-table-row'
import { CategoryFormModal } from '../../categories/components/category-form-modal'

export const AdminCategoriesPage = () => {
  const {
    categories,
    totalCount,
    loading,
    submitting,
    error,
    search,
    setSearch,
    modal,
    removeCategory,
  } = useCategoryAdmin()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Quản Lý Thể Loại</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Thêm mới, chỉnh sửa thông tin và quản lý các danh mục truyện ({totalCount} thể loại)
          </p>
        </div>
        <button
          type="button"
          onClick={modal.actions.openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-slate-950 font-bold text-sm rounded-xl transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm Thể Loại Mới
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên thể loại, slug, hoặc mô tả..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]/50 text-sm"
          />
        </div>
      </div>

      {/* Main Table / Empty State */}
      {loading ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center text-[var(--text-secondary)]">
          Đang tải danh sách thể loại...
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 text-[var(--accent-gold)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
          </div>
          <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            {search ? 'Không Tìm Thấy Thể Loại Nào' : 'Chưa Có Thể Loại Nào'}
          </h4>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto mb-6">
            {search
              ? `Không có thể loại nào khớp với từ khóa "${search}". Vui lòng thử tìm kiếm khác.`
              : 'Hệ thống chưa có thể loại nào. Hãy nhấn vào nút bên dưới để tạo thể loại đầu tiên!'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={modal.actions.openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-slate-950 font-bold text-sm rounded-xl transition-all"
            >
              + Tạo Thể Loại Đầu Tiên
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-secondary)]">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tên Thể Loại</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Mô Tả</th>
                  <th className="py-3.5 px-4">Số Lượng Truyện</th>
                  <th className="py-3.5 px-4">Ngày Tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {categories.map((category) => (
                  <CategoryTableRow
                    key={category.id}
                    category={category}
                    onEdit={modal.actions.openEdit}
                    onDelete={removeCategory}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <CategoryFormModal
        isOpen={modal.isOpen}
        editingCategory={modal.editingCategory}
        submitting={submitting}
        error={error}
        form={modal.form}
        actions={modal.actions}
      />
    </div>
  )
}

export default AdminCategoriesPage
