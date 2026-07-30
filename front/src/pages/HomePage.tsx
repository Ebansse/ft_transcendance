import { useState } from 'react'
import { Button } from '../components/Button.tsx'
import { api, ApiError } from '../lib/apiClient.ts'

type Hello = {
  message: string
}

export function HomePage() {
  const [hello, setHello] = useState<Hello | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      const result = await api.get<Hello>('/hello')
      setHello(result)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1>ft_transcendence</h1>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? 'chargement...' : 'try it'}
      </Button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {hello && <p>{hello.message}</p>}
    </>
  )
}
