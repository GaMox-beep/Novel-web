import { useNavigate } from 'react-router-dom'
import { useNovelAdmin } from '../../novels/hooks/use-novel-admin'
import { useCategories } from '../../categories/api/get-categories'
import { NovelFilterBar } from '../../novels/components/novel-filter-bar'
import { NovelTableRow } from '../../novels/components/novel-table-row'
import { NovelFormModal } from '../../novels/components/novel-form-modal'
import { paths } from '../../../config/paths'

export const AdminNovelsPage = () => {
  const navigate = useNavigate()
  const { data: categoriesData = [], isLoading: isCategoriesLoading } = useCategories()
  const {
    novels,
    categories,
    loading,
    submitting,
    error,
    filters: {
      search,
      setSearch,
      selectedCategory,
      setSelectedCategory,
      selectedStatus,
      setSelectedStatus,
    },
    modal,
    removeNovel,
  } = useNovelAdmin({ categories: categoriesData, isCategoriesLoading })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Quản Lý Bộ Truyện</h3>
          <p className="text-[var(--text-secondary)] text-sm">Thêm mới, cập nhật thông tin và quản lý các tác phẩm</p>
        </div>
        <button
          onClick={modal.actions.openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-slate-950 font-bold text-sm rounded-xl transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm Truyện Mới
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <NovelFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        categories={categories}
      />

      {/* Main Table / Empty State */}
      {loading ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center text-[var(--text-secondary)]">
          Đang tải danh sách truyện...
        </div>
      ) : novels.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 text-[var(--accent-gold)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
          </div>
          <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">Chưa Có Truyện Nào</h4>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto mb-6">
            Cơ sở dữ liệu của bạn chưa có bộ truyện nào. Hãy nhấn vào nút bên dưới để khởi tạo tác phẩm đầu tiên!
          </p>
          <button
            onClick={modal.actions.openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-slate-950 font-bold text-sm rounded-xl transition-all"
          >
            + Tạo Truyện Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-secondary)]">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Ảnh Bìa</th>
                  <th className="py-3.5 px-4">Tên Truyện</th>
                  <th className="py-3.5 px-4">Tác Giả</th>
                  <th className="py-3.5 px-4">Thể Loại</th>
                  <th className="py-3.5 px-4">Số Chương</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {novels.map((novel) => (
                  <NovelTableRow
                    key={novel.id}
                    novel={novel}
                    onEdit={modal.actions.openEdit}
                    onDelete={removeNovel}
                    onManageChapters={(novelId) => navigate(paths.admin.chapters.getHref(novelId))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <NovelFormModal
        isOpen={modal.isOpen}
        editingNovel={modal.editingNovel}
        categories={categories}
        submitting={submitting}
        error={error}
        form={modal.form}
        actions={modal.actions}
      />
    </div>
  )
}

export default AdminNovelsPage
