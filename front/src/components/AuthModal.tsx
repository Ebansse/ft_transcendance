import { useEffect, useRef } from 'react'
import { Button } from './Button.tsx'
import type { AuthMode } from '../auth/authModalContext.ts'
import type { LoginForm, SignupForm } from '../auth/AuthModalProvider.tsx'
import s from './AuthModal.module.css'

type AuthModalProps = {
  isOpen: boolean
  mode: AuthMode
  signup: SignupForm
  login: LoginForm
  fieldErrors: Record<string, string>
  globalError: string | null
  pending: boolean
  onSignupChange: (field: keyof SignupForm, value: string) => void
  onLoginChange: (field: keyof LoginForm, value: string) => void
  onSignupSubmit: (event: React.FormEvent) => void
  onLoginSubmit: (event: React.FormEvent) => void
  onModeChange: (mode: AuthMode) => void
  onClose: () => void
}

/**
 * Vue pure. On s'appuie sur le <dialog> natif : il fournit gratuitement le piège
 * de focus, la fermeture par Échap et l'inertie du reste de la page.
 */
export function AuthModal({
  isOpen,
  mode,
  signup,
  login,
  fieldErrors,
  globalError,
  pending,
  onSignupChange,
  onLoginChange,
  onSignupSubmit,
  onLoginSubmit,
  onModeChange,
  onClose,
}: AuthModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!isOpen) {
      if (dialog.open) dialog.close()
      return
    }
    if (!dialog.open) dialog.showModal()
    // Sans ça showModal() poserait le focus sur la croix de fermeture.
    dialog.querySelector('input')?.focus()
  }, [isOpen, mode])

  const isSignup = mode === 'signup'

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="auth-modal-title"
      onClose={onClose}
      onClick={(event) => {
        // La cible n'est le <dialog> lui-même que sur un clic dans le fond.
        if (event.target === ref.current) onClose()
      }}
    >
      <div className={s.head}>
        <h2 id="auth-modal-title" className={s.title}>
          {isSignup ? 'Rejoindre la table' : 'Reprendre la partie'}
        </h2>
        <Button variant="ghost" ariaLabel="Fermer" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className={s.tabs} role="tablist" aria-label="Mode d'authentification">
        <button
          type="button"
          role="tab"
          aria-selected={!isSignup}
          className={isSignup ? s.tab : `${s.tab} ${s.tabActive}`}
          onClick={() => onModeChange('login')}
        >
          Connexion
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignup}
          className={isSignup ? `${s.tab} ${s.tabActive}` : s.tab}
          onClick={() => onModeChange('signup')}
        >
          Inscription
        </button>
      </div>

      {isSignup ? (
        <form className={s.form} onSubmit={onSignupSubmit} noValidate>
          <Field
            id="signup-username"
            label="Nom d'utilisateur"
            value={signup.userName}
            error={fieldErrors.userName}
            onChange={(value) => onSignupChange('userName', value)}
            autoComplete="username"
            required
          />
          <Field
            id="signup-email"
            label="Email"
            type="email"
            value={signup.email}
            error={fieldErrors.email}
            onChange={(value) => onSignupChange('email', value)}
            autoComplete="email"
            required
          />
          <Field
            id="signup-password"
            label="Mot de passe"
            type="password"
            value={signup.password}
            error={fieldErrors.password}
            onChange={(value) => onSignupChange('password', value)}
            autoComplete="new-password"
            required
          />
          <Field
            id="signup-confirm"
            label="Confirmer le mot de passe"
            type="password"
            value={signup.confirmedPassword}
            error={fieldErrors.confirmedPassword}
            onChange={(value) => onSignupChange('confirmedPassword', value)}
            autoComplete="new-password"
            required
          />

          {globalError && (
            <p className={s.globalError} role="alert">
              {globalError}
            </p>
          )}

          <div className={s.submit}>
            <Button type="submit" variant="primary" fullWidth disabled={pending}>
              {pending ? 'Création…' : "S'inscrire"}
            </Button>
          </div>
        </form>
      ) : (
        <form className={s.form} onSubmit={onLoginSubmit} noValidate>
          <Field
            id="login-email"
            label="Email"
            type="email"
            value={login.email}
            error={fieldErrors.email}
            onChange={(value) => onLoginChange('email', value)}
            autoComplete="email"
            required
          />
          <Field
            id="login-password"
            label="Mot de passe"
            type="password"
            value={login.password}
            error={fieldErrors.password}
            onChange={(value) => onLoginChange('password', value)}
            autoComplete="current-password"
            required
          />

          {globalError && (
            <p className={s.globalError} role="alert">
              {globalError}
            </p>
          )}

          <div className={s.submit}>
            <Button type="submit" variant="primary" fullWidth disabled={pending}>
              {pending ? 'Connexion…' : 'Se connecter'}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  )
}

type FieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string
  autoComplete?: string
  required?: boolean
}

function Field({ id, label, value, onChange, type = 'text', error, autoComplete, required }: FieldProps) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={error ? `${s.input} ${s.inputError}` : s.input}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className={s.error}>
          {error}
        </p>
      )}
    </div>
  )
}
