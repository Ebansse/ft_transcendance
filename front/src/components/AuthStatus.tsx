import { useAuthModal } from '../auth/authModalContext.ts'
import s from './AuthStatus.module.css'

/** Pastille « session ouverte ». Ne rend rien tant qu'on n'est pas connecté. */
export function AuthStatus() {
  const { isLoggedIn } = useAuthModal()

  if (!isLoggedIn) return null

  return <span className={s.status}>Connecté</span>
}
