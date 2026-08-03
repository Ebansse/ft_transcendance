import { Button } from './Button.tsx'
import { handleAction } from '../lib/actions.ts'
import s from './Footer.module.css'

export function Footer() {
  return (
    <footer className={s.footer}>
      <p className={s.copy}>ft_transcendence — projet 42</p>
      <nav className={s.links} aria-label="Liens légaux">
        <Button variant="ghost" onClick={() => handleAction('nav:privacy')}>
          Politique de confidentialité
        </Button>
        <Button variant="ghost" onClick={() => handleAction('nav:terms')}>
          Conditions d'utilisation
        </Button>
      </nav>
    </footer>
  )
}
