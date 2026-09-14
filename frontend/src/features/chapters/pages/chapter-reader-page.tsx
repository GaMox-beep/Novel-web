import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useChapterByNumber } from '../api/get-chapter-by-number'
import { useNovel } from '../../novels/api/get-novel'
import { useUnlockChapter } from '../api/unlock-chapter'
import { ChapterReaderSkeleton } from '../components/chapter-reader-skeleton'
import { ChapterReaderHeader } from '../components/chapter-reader-header'
import {
  ChapterReaderContent,
  type FontSizeOption,
  type LineHeightOption,
} from '../components/chapter-reader-content'
import { ChapterReaderToolbar } from '../components/chapter-reader-toolbar'
import { ChapterReaderPaywall } from '../components/chapter-reader-paywall'
import { useAuth } from '../../../context/AuthContext'
import { BookmarkButton } from '../../bookmarks/components/bookmark-button'
import { paths } from '../../../config/paths'

const STORAGE_KEY_FONT_SIZE = 'webnovel_reader_font_size'
const STORAGE_KEY_LINE_HEIGHT = 'webnovel_reader_line_height'
const STORAGE_KEY_AUTO_UNLOCK = 'webnovel_auto_unlock_vip'

export const ChapterReaderPage = () => {
  const { slug, chapterNumber } = useParams<{ slug: string; chapterNumber: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const unlockMutation = useUnlockChapter()

  // Reading preference states with localStorage persistence
  const [fontSize, setFontSize] = useState<FontSizeOption>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FONT_SIZE)
    return (saved as FontSizeOption) || 'base'
  })

  const [lineHeight, setLineHeight] = useState<LineHeightOption>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LINE_HEIGHT)
    return (saved as LineHeightOption) || 'relaxed'
  })

  // Auto-unlock preference: defaulted to OFF (false) per strict user requirement
  const [autoUnlock, setAutoUnlock] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTO_UNLOCK) === 'true'
  })

  const handleFontSizeChange = (newSize: FontSizeOption) => {
    setFontSize(newSize)
    localStorage.setItem(STORAGE_KEY_FONT_SIZE, newSize)
  }

  const handleLineHeightChange = (newLineHeight: LineHeightOption) => {
    setLineHeight(newLineHeight)
    localStorage.setItem(STORAGE_KEY_LINE_HEIGHT, newLineHeight)
  }

  const handleToggleAutoUnlock = (enabled: boolean) => {
    setAutoUnlock(enabled)
    localStorage.setItem(STORAGE_KEY_AUTO_UNLOCK, String(enabled))
  }

  // Fetch current chapter content and navigation
  const {
    data: chapter,
    isLoading: isChapterLoading,
    error: chapterError,
  } = useChapterByNumber(slug || '', chapterNumber || '1')

  // Fetch novel details to get full chapter list for fast jumping
  const { data: novel } = useNovel(slug || '')

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [slug, chapterNumber])

  const currentNum = chapter?.chapterNumber !== undefined
    ? (typeof chapter.chapterNumber === 'number' ? chapter.chapterNumber : parseFloat(chapter.chapterNumber))
    : 1

  const handleUnlock = async () => {
    if (!chapter?.id) return
    try {
      await unlockMutation.mutateAsync({
        chapterId: chapter.id,
        novelSlug: slug,
        chapterNumber: currentNum,
      })
    } catch {
      // Error handled by mutation state
    }
  }

  // Auto-unlock trigger: only runs if user explicitly opted in
  useEffect(() => {
    if (
      autoUnlock &&
      chapter &&
      chapter.isVip &&
      chapter.isUnlocked === false &&
      isAuthenticated &&
      (user?.coins ?? 0) >= (chapter.price || 5) &&
      !unlockMutation.isPending &&
      !unlockMutation.isSuccess &&
      !unlockMutation.isError
    ) {
      if (chapter.id) {
        unlockMutation.mutate({
          chapterId: chapter.id,
          novelSlug: slug,
          chapterNumber: currentNum,
        })
      }
    }
  }, [
    autoUnlock,
    chapter,
    currentNum,
    isAuthenticated,
    user?.coins,
    slug,
    unlockMutation,
  ])

  // Keyboard navigation (ArrowLeft: Previous chapter, ArrowRight: Next chapter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      if (e.key === 'ArrowLeft' && chapter?.navigation.prevChapter && slug) {
        navigate(
          paths.novels.chapter.getHref(
            slug,
            chapter.navigation.prevChapter.chapterNumber,
          ),
        )
      } else if (e.key === 'ArrowRight' && chapter?.navigation.nextChapter && slug) {
        navigate(
          paths.novels.chapter.getHref(
            slug,
            chapter.navigation.nextChapter.chapterNumber,
          ),
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chapter, slug, navigate])

  if (isChapterLoading) {
    return <ChapterReaderSkeleton />
  }

  if (chapterError || !chapter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 space-y-4">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Không Tìm Thấy Chương Truyện
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Chương bạn đang tìm kiếm có thể chưa được phát hành hoặc đường dẫn không chính xác.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {slug && (
              <Link
                to={paths.novels.detail.getHref(slug)}
                className="px-4 py-2 bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] text-sm font-medium rounded-xl border border-[var(--border-color)] transition-all"
              >
                Về Trang Truyện
              </Link>
            )}
            <Link
              to={paths.home.getHref()}
              className="px-4 py-2 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-slate-950 font-semibold text-sm rounded-xl transition-all"
            >
              Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isLocked = chapter.isVip && chapter.isUnlocked === false

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header with Title & Metadata */}
      <ChapterReaderHeader
        chapter={chapter}
        actionSlot={<BookmarkButton novelId={chapter.novel.id} variant="compact" />}
      />

      {/* Top Navigation & Settings Bar */}
      <ChapterReaderToolbar
        novelSlug={chapter.novel.slug}
        currentChapterNumber={currentNum}
        prevChapter={chapter.navigation.prevChapter}
        nextChapter={chapter.navigation.nextChapter}
        allChapters={novel?.chapters}
        fontSize={fontSize}
        onChangeFontSize={handleFontSizeChange}
        lineHeight={lineHeight}
        onChangeLineHeight={handleLineHeightChange}
      />

      {/* Chapter Text Content Box */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-10 transition-colors">
        <ChapterReaderContent
          content={chapter.content}
          fontSize={fontSize}
          lineHeight={lineHeight}
        />

        {/* Paywall Container for Locked VIP Chapters */}
        {isLocked && (
          <ChapterReaderPaywall
            chapterId={chapter.id}
            chapterPrice={chapter.price || 5}
            user={user}
            isAuthenticated={isAuthenticated}
            isUnlocking={unlockMutation.isPending}
            unlockError={
              unlockMutation.error instanceof Error
                ? unlockMutation.error.message
                : null
            }
            autoUnlock={autoUnlock}
            onToggleAutoUnlock={handleToggleAutoUnlock}
            onUnlock={handleUnlock}
          />
        )}
      </div>

      {/* Bottom Navigation Toolbar */}
      <ChapterReaderToolbar
        novelSlug={chapter.novel.slug}
        currentChapterNumber={currentNum}
        prevChapter={chapter.navigation.prevChapter}
        nextChapter={chapter.navigation.nextChapter}
        allChapters={novel?.chapters}
        fontSize={fontSize}
        onChangeFontSize={handleFontSizeChange}
        lineHeight={lineHeight}
        onChangeLineHeight={handleLineHeightChange}
      />
    </div>
  )
}

export default ChapterReaderPage
