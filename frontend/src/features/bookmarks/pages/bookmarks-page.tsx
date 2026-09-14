import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { paths } from '../../../config/paths'
import { useBookmarks } from '../api/get-bookmarks'
import { useToggleBookmark } from '../api/toggle-bookmark'
import { NovelCard } from '../../novels/components/novel-card'
import { NovelCardSkeleton } from '../../novels/components/novel-card-skeleton'

interface RemoveBookmarkButtonProps {
  novelId: string
}

const RemoveBookmarkButton = ({ novelId }: RemoveBookmarkButtonProps) => {
  const toggleMutation = useToggleBookmark(novelId)

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleMutation.mutate()
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={toggleMutation.isPending}
      title="Xóa khỏi Tủ Truyện"
      className="w-7 h-7 rounded-lg bg-black/75 hover:bg-red-600 text-white border border-white/20 flex items-center justify-center transition-colors shadow-md backdrop-blur-xs"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}

export const BookmarksPage = () => {
  const { user, isAuthenticated, accessToken, isLoadingUser } = useAuth()
  const [page, setPage] = useState(1)
  const { data: bookmarksData, isLoading, error } = useBookmarks(
    { page, limit: 12 },
    { enabled: isAuthenticated }
  )

  if (accessToken && isLoadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--border-color)] border-t-[var(--accent-gold)]" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={paths.auth.login.getHref('/tu-truyen')} replace />
  }

  const items = bookmarksData?.items || []
  const meta = bookmarksData?.meta
  const totalCount = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--accent-gold)]"
            >
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            Tủ Truyện Của Tôi
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Danh sách các bộ truyện bạn đã đánh dấu theo dõi để đọc lại bất cứ lúc nào.
          </p>
        </div>

        {totalCount > 0 && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] self-start sm:self-auto">
            {totalCount} bộ truyện
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          Không thể tải danh sách tủ truyện: {error instanceof Error ? error.message : 'Lỗi kết nối máy chủ'}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <NovelCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center my-6 max-w-lg mx-auto">
          <div className="w-16 h-16 bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[var(--accent-gold)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </div>
          <h2 className="font-bold text-lg text-[var(--text-primary)] mb-2">Tủ Truyện Đang Trống</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
            Bạn chưa lưu bộ truyện nào vào tủ sách. Hãy khám phá kho tàng truyện phong phú và đánh dấu các tác phẩm bạn yêu thích!
          </p>
          <Link
            to={paths.novels.categories.getHref()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-gold)] text-slate-950 text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
          >
            Khám Phá Truyện Ngay
          </Link>
        </div>
      )}

      {/* Bookmarks Grid using unified NovelCard */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {items.map((item) => (
            <NovelCard
              key={item.bookmarkId}
              novel={item}
              topRightSlot={<RemoveBookmarkButton novelId={item.id} />}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-gold)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Trang trước
          </button>
          <span className="text-xs text-[var(--text-secondary)] px-2">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-gold)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  )
}

export default BookmarksPage
