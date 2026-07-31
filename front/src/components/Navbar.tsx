import type { ReactNode } from 'react'
import s from './Navbar.module.css'

type NavbarProps = {
  title: string
  /** Slot de gauche (ex: bouton menu en mobile). */
  leading?: ReactNode
  /** Slot de droite (ex: Se connecter / S'inscrire). */
  action?: ReactNode
}

export function Navbar({ title, leading, action }: NavbarProps) {
  return (
    <nav className={s.navbar}>
      <div className={s.side}>{leading}</div>
      <h1 className={s.title}>{title}</h1>
      <div className={`${s.side} ${s.sideEnd}`}>{action}</div>
    </nav>
  )
}
