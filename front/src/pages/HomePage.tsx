import { useState } from 'react'
import { Button } from '../components/Button.tsx'
import { Footer } from '../components/Footer.tsx'
import { GameCard } from '../components/GameCard.tsx'
import { Navbar } from '../components/Navbar.tsx'
import { Sidebar } from '../components/Sidebar.tsx'
import { handleAction } from '../lib/actions.ts'

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

  return (
    <div className="app-shell">
      <Navbar
        title="ft_transcendence"
        leading={
          <span className="navbar-menu-toggle">
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
          <>
            <Button variant="ghost" onClick={() => handleAction('auth:login')}>
              Se connecter
            </Button>
            <Button variant="primary" onClick={() => handleAction('auth:register')}>
              S'inscrire
            </Button>
          </>
        }
      />

      <div className="app-body">
        <Sidebar open={menuOpen} current="nav:home" />

        <main className="main" aria-label="Contenu principal">
          <section className="hero">
            <h2 className="hero-title">Bienvenue sur le hub</h2>
            <p className="hero-subtitle">
              Échecs, Blackjack et Uno : contre des bots ou en ligne, avec tes amis.
            </p>
            <div className="hero-actions">
              <Button variant="primary" onClick={() => handleAction('auth:register')}>
                Créer un compte
              </Button>
              <Button variant="secondary" onClick={() => handleAction('play:quick')}>
                Partie rapide
              </Button>
            </div>
          </section>

          <section aria-labelledby="games-title">
            <h2 id="games-title" className="section-title">
              Les jeux
            </h2>
            <div className="game-grid">
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
