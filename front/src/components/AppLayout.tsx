import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AuthStatus } from './AuthStatus.tsx'
import { Button } from './Button.tsx'
import { Footer } from './Footer.tsx'
import { Navbar } from './Navbar.tsx'
import { Sidebar } from './Sidebar.tsx'
import s from './AppLayout.module.css'

type AppLayoutProps = {
  /** Action de nav de la page courante (ex: 'nav:admin'), pour surligner l'onglet. */
  current: string
  onNavigate: (action: string) => void
  children: ReactNode
}

/**
 * Chrome de l'application : chaque page se contente de fournir son contenu,
 * la navbar et la sidebar restent identiques d'un onglet à l'autre.
 */
export function AppLayout({ current, onNavigate, children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={s.shell}>
      <Navbar
        title="ft_transcendence"
        leading={
          <span className={s.menuToggle}>
            <Button
              variant="ghost"
              ariaLabel={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </Button>
          </span>
        }
        action={<SessionActions />}
      />

      <div className={s.body}>
        <Sidebar
          open={menuOpen}
          current={current}
          onNavigate={(action) => {
            // En mobile la sidebar recouvre le contenu : on la referme après le clic.
            setMenuOpen(false)
            onNavigate(action)
          }}
        />

        <main className={s.main} aria-label="Contenu principal">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  )
}

/** Coin droit de la navbar : pastille de session, ou invitations à se connecter. */
function SessionActions() {
  const { openModal, isLoggedIn, authChecked } = useAuthModal()

  // Tant que la session n'est pas vérifiée on n'affiche rien : sinon un
  // utilisateur connecté verrait « Se connecter » clignoter à chaque F5.
  if (!authChecked) return null
  if (isLoggedIn) return <AuthStatus />

  return (
    <>
      <Button variant="ghost" onClick={() => openModal('login')}>
        Se connecter
      </Button>
      <Button variant="primary" onClick={() => openModal('signup')}>
        S'inscrire
      </Button>
    </>
  )
}
