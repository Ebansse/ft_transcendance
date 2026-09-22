import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { useAuthModal } from '../auth/authModalContext.ts'
import { NotificationBell } from './NotificationBell.tsx'
import s from './Navbar.module.css'

type NavbarProps = {
  title: string
  /** Slot de gauche (ex: bouton menu en mobile). */
  leading?: ReactNode
  /** Slot de droite (ex: Se connecter / S'inscrire). */
  action?: ReactNode
}

export function Navbar({ title, leading, action }: NavbarProps) {
  const { isLoggedIn, logout } = useAuthModal()

  return (
    <nav className={s.navbar}>
      <div className={s.side}>{leading}</div>
      <h1 className={s.title}>{title}</h1>
      <div className={`${s.side} ${s.sideEnd}`}>
        {action}
        {isLoggedIn && <NotificationBell />}
        {isLoggedIn && (
          <Button variant="ghost" onClick={() => void logout()}>
            Déconnexion
          </Button>
        )}
      </div>
    </nav>
  )
}
