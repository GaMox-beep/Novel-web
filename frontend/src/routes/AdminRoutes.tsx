import { Route } from 'react-router-dom'
import AdminLayout from '../layout/AdminLayout'
import { AdminDashboardPage } from '../features/admin/pages/admin-dashboard-page'
import { AdminNovelsPage } from '../features/admin/pages/admin-novels-page'
import { AdminCategoriesPage } from '../features/admin/pages/admin-categories-page'
import { AdminChaptersPage } from '../features/admin/pages/admin-chapters-page'
import ProtectedRoute from '../components/guards/protected-route'
import { paths } from '../config/paths'

// eslint-disable-next-line react-refresh/only-export-components
export const AdminRoutes = (
  <Route element={<ProtectedRoute redirectPath={paths.home.path} />}>
    <Route element={<AdminLayout />}>
      <Route path={paths.admin.dashboard.path} element={<AdminDashboardPage />} />
      <Route path={paths.admin.novels.path} element={<AdminNovelsPage />} />
      <Route path={paths.admin.categories.path} element={<AdminCategoriesPage />} />
      <Route path={paths.admin.users.path} element={<AdminDashboardPage />} />
      <Route path={paths.admin.chapters.path} element={<AdminChaptersPage />} />
    </Route>
  </Route>
)

export default AdminRoutes
