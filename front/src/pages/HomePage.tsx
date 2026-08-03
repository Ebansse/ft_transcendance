import { useState } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AuthStatus } from '../components/AuthStatus.tsx'
import { Button } from '../components/Button.tsx'
import { Footer } from '../components/Footer.tsx'
import { GameCard } from '../components/GameCard.tsx'
import { Navbar } from '../components/Navbar.tsx'
import { Sidebar } from '../components/Sidebar.tsx'
import { handleAction } from '../lib/actions.ts'
import s from './HomePage.module.css'

const GAMES = [
  {
    slug: 'chess',
    name: 'Échecs',
    icon: '♟️',
    description: 'Le grand classique. Parties classées, historique complet de tes coups.',
    playersOnline: 0,
  },
  {
    slug: 'blackjack',
    name: 'Blackjack',
    icon: '🃏',
    description: 'Tire ou reste. Affronte le croupier ou une table de joueurs.',
    playersOnline: 0,
  },
  {
    slug: 'uno',
    name: 'Uno',
    icon: '🎴',
    description: 'Cartes spéciales, tours inversés, et le fameux +4.',
    playersOnline: 0,
  },
]

export function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { openModal, isLoggedIn } = useAuthModal()

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
        action={
          isLoggedIn ? (
            <AuthStatus />
          ) : (
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
      />

      <div className={s.body}>
        <Sidebar open={menuOpen} current="nav:home" />

        <main className={s.main} aria-label="Contenu principal">
          <section className={s.hero}>
            <h2 className={s.heroTitle}>Bienvenue sur le hub</h2>
            <p className={s.heroSubtitle}>
              Échecs, Blackjack et Uno : contre des bots ou en ligne, avec tes amis.
            </p>
            <div className={s.heroActions}>
              <Button variant="primary" onClick={() => openModal('signup')}>
                Créer un compte
              </Button>
              <Button variant="secondary" onClick={() => handleAction('play:quick')}>
                Partie rapide
              </Button>
            </div>
          </section>

          <section aria-labelledby="games-title">
            <h2 id="games-title" className={s.sectionTitle}>
              Les jeux
            </h2>
            <div className={s.gameGrid}>
              {GAMES.map((game) => (
                <GameCard key={game.slug} {...game} />
              ))}
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}
