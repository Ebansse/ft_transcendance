import { useState } from 'react'

type Hello = {
  message: string
}

function App() {
  const [hello, setHello] = useState<Hello | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('http://localhost:8080/hello')
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data: Hello = await resp.json()
      setHello(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1>ft_transcendence</h1>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'chargement...' : 'try it'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {hello && <p>{hello.message}</p>}
    </>
  )
}

export default App
