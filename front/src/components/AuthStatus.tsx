import s from './AuthStatus.module.css'

/** Pastille « session ouverte ». C'est l'appelant qui décide de l'afficher. */
export function AuthStatus() {
  return <span className={s.status}>Connecté</span>
}
