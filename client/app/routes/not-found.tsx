import { data } from 'react-router'

export function clientLoader() {
  throw data(null, { status: 404 })
}

export { RouteErrorBoundary as ErrorBoundary } from '~/components/layout/RouteErrorBoundary'

export default function NotFound() {
  return null
}
