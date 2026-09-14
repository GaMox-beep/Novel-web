import { Route } from 'react-router-dom'
import CustomerLayout from '../layout/CustomerLayout'
import { HomePage } from '../features/landing/pages/home-page'
import { TopNovelsPage } from '../features/landing/pages/top-novels-page'
import { RechargePage } from '../features/payments/pages/recharge-page'
import { PaymentResultPage } from '../features/payments/pages/payment-result-page'
import { LoginPage } from '../features/auth/pages/login-page'
import { RegisterPage } from '../features/auth/pages/register-page'
import { GoogleOAuthCallbackPage } from '../features/auth/pages/google-oauth-callback-page'
import { ProfilePage } from '../features/users/pages/profile-page'
import { NovelDetailPage } from '../features/novels/pages/novel-detail-page'
import { ChapterReaderPage } from '../features/chapters/pages/chapter-reader-page'
import { NovelsByCategoryPage } from '../features/novels/pages/novels-by-category-page'
import { BookmarksPage } from '../features/bookmarks/pages/bookmarks-page'
import { paths } from '../config/paths'

// eslint-disable-next-line react-refresh/only-export-components
export const CustomerRoutes = (
  <Route element={<CustomerLayout />}>
    <Route path={paths.home.path} element={<HomePage />} />
    <Route path={paths.novels.categories.path} element={<NovelsByCategoryPage />} />
    <Route path={paths.novels.top.path} element={<TopNovelsPage />} />
    <Route path={paths.novels.bookmarks.path} element={<BookmarksPage />} />
    <Route path={paths.novels.detail.path} element={<NovelDetailPage />} />
    <Route path={paths.novels.chapter.path} element={<ChapterReaderPage />} />
    <Route path={paths.payments.recharge.path} element={<RechargePage />} />
    <Route path={paths.payments.result.path} element={<PaymentResultPage />} />
    <Route path={paths.auth.login.path} element={<LoginPage />} />
    <Route path={paths.auth.register.path} element={<RegisterPage />} />
    <Route path={paths.auth.googleCallback.path} element={<GoogleOAuthCallbackPage />} />
    <Route path={paths.users.profile.path} element={<ProfilePage />} />
  </Route>
)

export default CustomerRoutes