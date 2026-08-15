import type { ReactNode } from 'react'
import s from './PageHeader.module.css'

type PageHeaderProps = {
  title: string
  subtitle: string
  /** Classe posée en plus sur la racine, pour un décor propre à la page. */
  className?: string
  /** Actions affichées sous l'accroche (boutons). */
  children?: ReactNode
}

/** En-tête commun à toutes les pages : même échelle typographique partout. */
export function PageHeader({ title, subtitle, className, children }: PageHeaderProps) {
  return (
    <header className={className ? `${s.header} ${className}` : s.header}>
      <h2 className={s.title}>{title}</h2>
      <p className={s.subtitle}>{subtitle}</p>
      {children ? <div className={s.actions}>{children}</div> : null}
    </header>
  )
}
