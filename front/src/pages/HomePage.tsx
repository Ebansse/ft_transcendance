import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { GameCard } from '../components/GameCard.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
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

type HomePageProps = {
  onNavigate: (action: string) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { openModal } = useAuthModal()

  return (
    <AppLayout current="nav:home" onNavigate={onNavigate}>
      {/* Le décor (échiquier) est propre à l'accueil : il passe par className. */}
      <PageHeader
        className={s.heroDecor}
        title="Bienvenue sur le hub"
        subtitle="Échecs, Blackjack et Uno : contre des bots ou en ligne, avec tes amis."
      >
        <Button variant="primary" onClick={() => openModal('signup')}>
          Créer un compte
        </Button>
        <Button variant="secondary" onClick={() => handleAction('quick-play')}>
          Partie rapide
        </Button>
      </PageHeader>

      <section aria-labelledby="games-title">
        <SectionTitle id="games-title">Les jeux</SectionTitle>
        <div className={s.gameGrid}>
          {GAMES.map((game) => (
            <GameCard key={game.slug} {...game} />
          ))}
        </div>
      </section>
    </AppLayout>
  )
}
