import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNovels } from '../api/get-novels'
import { useCategories } from '../../categories/api/get-categories'
import { NovelCard } from '../components/novel-card'
import { CategoryFilterPills } from '../../categories/components/category-filter-pills'
import { NovelFilterToolbar } from '../components/novel-filter-toolbar'

export const NovelsByCategoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentSlug = searchParams.get('slug') || ''

  const [status, setStatus] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'createdAt' | 'views' | 'rating'>('createdAt')
  const [page, setPage] = useState<number>(1)

  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories()

  const {
    data: novelsData,
    isLoading: isNovelsLoading,
    error,
  } = useNovels({
    categorySlug: currentSlug || undefined,
    status: status !== 'ALL' ? status : undefined,
    sortBy,
    sortOrder: 'desc',
    page,
    limit: 18,
  })

  const currentCategory = useMemo(() => {
    if (!currentSlug) return null
    return categories.find((c) => c.slug === currentSlug) || null
  }, [categories, currentSlug])

  const handleSelectCategory = (slug: string) => {
    setPage(1)
    if (slug) {
      setSearchParams({ slug })
    } else {
      setSearchParams({})
    }
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    setPage(1)
  }

  const handleSortChange = (newSort: 'createdAt' | 'views' | 'rating') => {
    setSortBy(newSort)
    setPage(1)
  }

  const novels = novelsData?.items || []
  const totalNovels = novelsData?.meta?.total ?? novels.length
  const totalPages = novelsData?.meta?.totalPages ?? Math.max(1, Math.ceil(totalNovels / 18))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Title & Category Info Header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                {currentCategory ? currentCategory.name : 'Tất Cả Thể Loại'}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                {totalNovels} truyện
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
              {currentCategory?.description ||
                'Khám phá kho tàng truyện phong phú theo thể loại yêu thích của bạn'}
            </p>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
          <CategoryFilterPills
            categories={categories}
            currentSlug={currentSlug}
            onSelectCategory={handleSelectCategory}
          />
        </div>
      </div>

      {/* Filter & Sort Controls Toolbar */}
      <NovelFilterToolbar
        status={status}
        onStatusChange={handleStatusChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
          {error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải danh sách truyện'}
        </div>
      )}

      {/* Novel List / Loading Skeletons / Empty State */}
      {isNovelsLoading || isCategoriesLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden animate-pulse"
            >
              <div className="w-full aspect-[2/3] bg-[var(--bg-surface-elevated)]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-[var(--bg-surface-elevated)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : novels.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] text-[var(--accent-gold)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
            Không Tìm Thấy Truyện Nào
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
            Hiện tại chưa có tác phẩm nào phù hợp với bộ lọc đã chọn. Hãy thử chọn thể loại hoặc trạng thái khác.
          </p>
          {(currentSlug || status !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setStatus('ALL')
                handleSelectCategory('')
              }}
              className="px-4 py-2 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              Xóa Bộ Lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)] disabled:opacity-40 transition-colors"
          >
            Trang Trước
          </button>
          <span className="text-xs text-[var(--text-secondary)] px-2">
            Trang <span className="font-semibold text-[var(--text-primary)]">{page}</span> / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)] disabled:opacity-40 transition-colors"
          >
            Trang Sau
          </button>
        </div>
      )}
    </div>
  )
}

export default NovelsByCategoryPage
