import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthModal } from '../components/AuthModal.tsx'
import type { LoginForm, SignupForm } from '../components/AuthModal.tsx'
import { TwoFactorModal } from '../components/TwoFactorModal.tsx'
import { getMyProfile } from '../lib/actions.ts'
import type { UserPublicProfileDto } from '../lib/actions.ts'
import { api, ApiError } from '../lib/apiClient.ts'
import { AuthModalContext } from './authModalContext.ts'
import type { AuthMode } from './authModalContext.ts'

/** /auth/login répond "Login successful" (texte), ou ce JSON si le compte attend un code A2F. */
type LoginResponse = string | { twoFactorRequired: true }

/**
 * Détient la session et parle au back. La modale garde ses propres champs et ses
 * erreurs : elle ne reçoit d'ici que de quoi s'ouvrir et de quoi envoyer.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')
  const [user, setUser] = useState<UserPublicProfileDto | null>(null)
  // Tant que la session n'est pas vérifiée, l'UI n'affiche ni « connecté » ni « invité ».
  const [authChecked, setAuthChecked] = useState(false)
  // Identifiants gardés le temps de saisir le code A2F, puis renvoyés avec lui.
  const [twoFactorLogin, setTwoFactorLogin] = useState<LoginForm | null>(null)
  const [twoFactorPending, setTwoFactorPending] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)

  // Restauration de session : le cookie httpOnly survit au rechargement de la page.
  useEffect(() => {
    let cancelled = false
    getMyProfile()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openModal = useCallback((next: AuthMode = 'login') => {
    setMode(next)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => setIsOpen(false), [])

  const logout = useCallback(async () => {
    try {
      await api.post<string>('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  /** Après une édition de profil : on relit la source de vérité côté back. */
  const refreshUser = useCallback(async () => {
    setUser(await getMyProfile())
  }, [])

  /** Ouvre la session : le back pose les cookies, on lit le profil dans la foulée.
   *  Si le compte a l'A2F, pas de cookie : on passe à la modale du code. */
  const login = async (values: LoginForm) => {
    const res = await api.post<LoginResponse>('/auth/login', values)
    setIsOpen(false)
    if (typeof res === 'object' && res.twoFactorRequired) {
      setTwoFactorLogin(values)
      return
    }
    setUser(await getMyProfile())
  }

  const closeTwoFactor = () => {
    setTwoFactorLogin(null)
    setTwoFactorError(null)
  }

  /** Second envoi : mêmes identifiants + code. */
  const submitTwoFactor = async (code: string) => {
    if (!twoFactorLogin) return
    setTwoFactorPending(true)
    setTwoFactorError(null)
    try {
      await api.post<string>('/auth/login', { ...twoFactorLogin, code })
      setUser(await getMyProfile())
      closeTwoFactor()
    } catch (err) {
      const message = err instanceof ApiError ? (err.fieldErrors.code ?? err.message) : null
      setTwoFactorError(message ?? 'Vérification impossible.')
    } finally {
      setTwoFactorPending(false)
    }
  }

  /** /register renvoie un 201 sans cookie : on enchaîne pour ouvrir la session. */
  const signup = async (values: SignupForm) => {
    await api.post<void>('/auth/register', values)
    await login({ email: values.email, password: values.password })
  }

  const value = useMemo(
    () => ({
      isOpen,
      mode,
      isLoggedIn: user !== null,
      user,
      authChecked,
      openModal,
      closeModal,
      logout,
      refreshUser,
    }),
    [isOpen, mode, user, authChecked, openModal, closeModal, logout, refreshUser],
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={isOpen}
        mode={mode}
        onModeChange={setMode}
        onClose={closeModal}
        onSignup={signup}
        onLogin={login}
      />
      {/* La clé vide le champ du code à chaque nouvelle connexion. */}
      <TwoFactorModal
        key={twoFactorLogin ? 'open' : 'closed'}
        mode={twoFactorLogin ? 'login' : null}
        pending={twoFactorPending}
        error={twoFactorError}
        onSubmit={submitTwoFactor}
        onClose={closeTwoFactor}
      />
    </AuthModalContext.Provider>
  )
}
