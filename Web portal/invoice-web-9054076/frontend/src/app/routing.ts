import { useCallback, useEffect, useState } from 'react'

export type AppRoute = {page: string; id: string; revision?: number}

function readRoute(): AppRoute {
  const params = new URLSearchParams(location.hash.slice(1))
  const revision = Number(params.get('revision'))
  return {
    page: params.get('page') || 'documents',
    id: params.get('document') || '',
    revision: Number.isInteger(revision) && revision > 0 ? revision : undefined,
  }
}

export function useHashRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const handleChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', handleChange)
    return () => window.removeEventListener('hashchange', handleChange)
  }, [])
  const navigate = useCallback((page: string, id = '', revision?: number) => {
    location.hash = new URLSearchParams({
      page,
      ...(id ? {document: id} : {}),
      ...(revision ? {revision: String(revision)} : {}),
    }).toString()
  }, [])
  return {route, navigate}
}
