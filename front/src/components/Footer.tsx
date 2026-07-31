import { Button } from './Button.tsx'
import { handleAction } from '../lib/actions.ts'

export function Footer() {
  return (
    <footer className="footer">
      <p className="footer-copy">ft_transcendence — projet 42</p>
      <nav className="footer-links" aria-label="Liens légaux">
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
