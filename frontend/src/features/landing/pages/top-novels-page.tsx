export const TopNovelsPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-center">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--accent-gold)]"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
            <path d="M12 2a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Bảng Xếp Hạng</h2>
        <p className="text-[var(--text-secondary)] max-w-md text-sm">
          Khám phá những bộ truyện hot nhất, được đọc nhiều nhất và đánh giá cao nhất bởi các độc giả khác.
        </p>
        <p className="text-xs font-medium text-[var(--text-muted)] mt-4">
          Tính năng đang được phát triển
        </p>
      </div>
    </div>
  )
}

export default TopNovelsPage
