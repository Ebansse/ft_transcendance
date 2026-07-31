import type { ReactNode } from 'react'

type NavbarProps = {
  title: string
  /** Slot de gauche (ex: bouton menu en mobile). */
  leading?: ReactNode
  /** Slot de droite (ex: Se connecter / S'inscrire). */
  action?: ReactNode
}

export function Navbar({ title, leading, action }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-side">{leading}</div>
      <h1 className="navbar-title">{title}</h1>
      <div className="navbar-side navbar-side-end">{action}</div>
    </nav>
  )
}
