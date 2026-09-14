import type { Novel } from '../novels/types'

export interface BookmarkedNovelItem extends Novel {
  bookmarkId: string
  bookmarkedAt: string
}

export interface PaginatedBookmarks {
  items: BookmarkedNovelItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
