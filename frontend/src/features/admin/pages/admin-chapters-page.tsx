import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNovels } from '../../novels/api/get-novels'
import { useNovel } from '../../novels/api/get-novel'
import { useChapterAdmin } from '../../chapters/hooks/use-chapter-admin'
import { ChapterTableRow } from '../../chapters/components/chapter-table-row'
import { ChapterFormModal } from '../../chapters/components/chapter-form-modal'

export const AdminChaptersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlNovelId = searchParams.get('novelId') || ''

  const { data: novelsData, isLoading: isNovelsLoading } = useNovels({ limit: 100 })
  const novels = novelsData?.items || []

  const [localNovelId, setLocalNovelId] = useState<string>(urlNovelId)

  // Derived active novel ID
  const selectedNovelId = localNovelId || (novels.length > 0 ? novels[0].id : '')
  const selectedNovelSummary = novels.find((n) => n.id === selectedNovelId)

  // Fetch full novel detail with chapters
  const {
    data: fullNovelData,
    isLoading: isNovelLoading,
    refetch: refetchNovel,
  } = useNovel(selectedNovelSummary?.slug || '')

  const chapters = fullNovelData?.chapters || []

  const { submitting, error, modal, removeChapter } = useChapterAdmin({
    novelId: selectedNovelId,
    chapters,
    onSuccess: () => {
      refetchNovel()
    },
  })

  const handleNovelChange = (novelId: string) => {
    setLocalNovelId(novelId)
    setSearchParams({ novelId })
  }

  const loading = isNovelsLoading || isNovelLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Quản Lý Chương Truyện</h3>
          <p className="text-[var(--text-secondary)] text-sm">Đăng chương mới, chỉnh sửa nội dung và phân loại chương VIP</p>
        </div>
        <button
          onClick={modal.actions.openCreate}
          disabled={!selectedNovelId}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm Chương Mới
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Select Novel Selector */}
      <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)]">
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Chọn Bộ Truyện Cần Quản Lý:</label>
        <select
          value={selectedNovelId}
          onChange={(e) => handleNovelChange(e.target.value)}
          className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--accent-gold)] font-semibold text-base rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-gold)]"
        >
          {novels.length === 0 ? (
            <option value="">(Chưa có bộ truyện nào - Hãy tạo truyện trước)</option>
          ) : (
            novels.map((novel) => (
              <option key={novel.id} value={novel.id}>
                {novel.title} ({novel.authorName})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Main Table / Empty State */}
      {loading ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center text-[var(--text-secondary)]">
          Đang tải danh sách chương...
        </div>
      ) : !selectedNovelId ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center text-[var(--text-secondary)]">
          Vui lòng chọn hoặc tạo một bộ truyện trước.
        </div>
      ) : chapters.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 text-[var(--accent-gold)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">Chưa Có Chương Nào</h4>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto mb-6">
            Bộ truyện này hiện chưa được đăng chương nào. Hãy nhấn vào nút bên dưới để thêm chương đầu tiên!
          </p>
          <button
            onClick={modal.actions.openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-slate-950 font-bold text-sm rounded-xl transition-all"
          >
            + Đăng Chương Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-secondary)]">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Số Chương</th>
                  <th className="py-3.5 px-4">Tiêu Đề</th>
                  <th className="py-3.5 px-4">Loại Chương</th>
                  <th className="py-3.5 px-4">Lượt Đọc</th>
                  <th className="py-3.5 px-4">Ngày Đăng</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {chapters.map((chapter) => (
                  <ChapterTableRow
                    key={chapter.id}
                    chapter={chapter}
                    onEdit={modal.actions.openEdit}
                    onDelete={removeChapter}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <ChapterFormModal
        isOpen={modal.isOpen}
        editingChapter={modal.editingChapter}
        submitting={submitting}
        error={error}
        form={modal.form}
        actions={modal.actions}
      />
    </div>
  )
}

export default AdminChaptersPage
