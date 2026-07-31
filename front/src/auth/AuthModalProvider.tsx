import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthModal } from '../components/AuthModal.tsx'
import { api, ApiError } from '../lib/apiClient.ts'
import { AuthModalContext } from './authModalContext.ts'
import type { AuthMode } from './authModalContext.ts'

export type SignupForm = {
  userName: string
  email: string
  password: string
  confirmedPassword: string
}

export type LoginForm = {
  email: string
  password: string
}

const EMPTY_SIGNUP: SignupForm = { userName: '', email: '', password: '', confirmedPassword: '' }
const EMPTY_LOGIN: LoginForm = { email: '', password: '' }

/**
 * Détient l'état d'authentification et parle au back. La modale n'est qu'une vue :
 * elle reçoit tout par props, ce qui la garde testable et sans logique réseau.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [signup, setSignup] = useState<SignupForm>(EMPTY_SIGNUP)
  const [login, setLogin] = useState<LoginForm>(EMPTY_LOGIN)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const clearErrors = () => {
    setFieldErrors({})
    setGlobalError(null)
  }

  const openModal = useCallback((next: AuthMode = 'login') => {
    clearErrors()
    setMode(next)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    clearErrors()
  }, [])

  const switchMode = useCallback((next: AuthMode) => {
    clearErrors()
    setMode(next)
  }, [])

  /** Traduit une erreur réseau en messages affichables sous les champs concernés. */
  const reportError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors)
        return
      }
      // Le back répond "Invalid credentials" en anglais et sans détail.
      setGlobalError(err.status === 401 ? 'Email ou mot de passe incorrect.' : err.message)
      return
    }
    setGlobalError('Erreur inconnue.')
  }

  const submitLogin = async (credentials: LoginForm) => {
    // Le cookie access_token est httpOnly : le back l'attache, on ne le lit jamais.
    await api.post<string>('/auth/login', credentials)
    setIsLoggedIn(true)
    setSignup(EMPTY_SIGNUP)
    setLogin(EMPTY_LOGIN)
    setIsOpen(false)
  }

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    clearErrors()

    // Validation front (le back revalide) : la confirmation ne lui est pas envoyée.
    if (signup.password !== signup.confirmedPassword) {
      setFieldErrors({ confirmedPassword: 'Les mots de passe ne correspondent pas.' })
      return
    }

    setPending(true)
    try {
      await api.post<void>('/auth/register', signup)
      // /register renvoie un 201 sans cookie : on enchaîne pour ouvrir la session.
      await submitLogin({ email: signup.email, password: signup.password })
    } catch (err) {
      reportError(err)
    } finally {
      setPending(false)
    }
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    clearErrors()
    setPending(true)
    try {
      await submitLogin(login)
    } catch (err) {
      reportError(err)
    } finally {
      setPending(false)
    }
  }

  const value = useMemo(
    () => ({ isOpen, mode, isLoggedIn, openModal, closeModal, setMode: switchMode }),
    [isOpen, mode, isLoggedIn, openModal, closeModal, switchMode],
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={isOpen}
        mode={mode}
        signup={signup}
        login={login}
        fieldErrors={fieldErrors}
        globalError={globalError}
        pending={pending}
        onSignupChange={(field, val) => setSignup((prev) => ({ ...prev, [field]: val }))}
        onLoginChange={(field, val) => setLogin((prev) => ({ ...prev, [field]: val }))}
        onSignupSubmit={handleSignup}
        onLoginSubmit={handleLogin}
        onModeChange={switchMode}
        onClose={closeModal}
      />
    </AuthModalContext.Provider>
  )
}
