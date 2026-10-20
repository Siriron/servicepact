import { useEffect, useState } from 'react'

export function navigate(to: string) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}
export function usePath(): string {
  const [p, setP] = useState(window.location.pathname)
  useEffect(() => {
    const f = () => setP(window.location.pathname)
    window.addEventListener('popstate', f)
    return () => window.removeEventListener('popstate', f)
  }, [])
  return p
}
