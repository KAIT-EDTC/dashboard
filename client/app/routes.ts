import { index, layout, prefix, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),

  // ログインが必要な画面（routes/app-layout.tsx の clientLoader で認証する）
  layout('routes/app-layout.tsx', { id: 'app' }, [
    index('routes/home.tsx'),
    ...prefix('events', [
      index('routes/events/list.tsx'),
      route('new', 'routes/events/new.tsx'),
      route(':eventId', 'routes/events/detail.tsx'),
      route(':eventId/edit', 'routes/events/edit.tsx'),
    ]),
    ...prefix('reports', [
      index('routes/reports/list.tsx'),
      route('new', 'routes/reports/new.tsx'),
      route('summaries/new', 'routes/reports/summary-new.tsx'),
      route(':reportId', 'routes/reports/detail.tsx'),
    ]),
    ...prefix('blog', [
      index('routes/blog/list.tsx'),
      route(':postId', 'routes/blog/post.tsx'),
    ]),
    ...prefix('members', [
      index('routes/members/list.tsx'),
      route(':memberId', 'routes/members/detail.tsx'),
    ]),
    route('admin/users', 'routes/admin/users.tsx'),
    route('admin/notifications', 'routes/admin/notifications.tsx'),
    route('admin/event-settings', 'routes/admin/event-settings.tsx'),
    route('admin/blog-settings', 'routes/admin/blog-settings.tsx'),
    route('profile', 'routes/profile.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig
