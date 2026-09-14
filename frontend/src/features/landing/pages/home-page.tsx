import { paths } from '../../../config/paths'
import { useNovels } from '../../novels/api/get-novels'
import { NovelSection } from '../../novels/components/novel-section'

export const HomePage = () => {
  const {
    data: recentNovelsData,
    isLoading: isLoadingRecent,
    error: recentError,
  } = useNovels({ sortBy: 'updatedAt', sortOrder: 'desc', limit: 6 })

  const {
    data: topNovelsData,
    isLoading: isLoadingTop,
    error: topError,
  } = useNovels({ sortBy: 'views', sortOrder: 'desc', limit: 6 })

  const recentNovels = recentNovelsData?.items || []
  const topNovels = topNovelsData?.items || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-10">
      {/* Subtle Welcome Hero Banner */}
      <section className="relative overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold text-[var(--accent-gold)]">
            Nền tảng đọc truyện chữ trực tuyến
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Khám phá thế giới truyện chữ đỉnh cao cùng <span className="text-[var(--accent-gold)]">Novelis</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Hàng ngàn bộ truyện tiên hiệp, kiếm hiệp, đô thị, huyền huyễn được cập nhật liên tục mỗi ngày với giao diện tối ưu tốc độ cao.
          </p>
        </div>
      </section>

      {/* Section 1: Truyện Mới Cập Nhật */}
      <NovelSection
        title="Truyện Mới Cập Nhật"
        viewAllHref={paths.novels.categories.getHref()}
        novels={recentNovels}
        isLoading={isLoadingRecent}
        error={recentError}
        skeletonCount={6}
        emptyMessage="Hiện chưa có truyện mới cập nhật."
      />

      {/* Section 2: Truyện Đọc Nhiều Nhất */}
      <NovelSection
        title="Truyện Đọc Nhiều Nhất"
        viewAllHref={paths.novels.top.getHref()}
        novels={topNovels}
        isLoading={isLoadingTop}
        error={topError}
        skeletonCount={6}
        emptyMessage="Hiện chưa có truyện nào được xếp hạng."
      />
    </div>
  )
}

export default HomePage
