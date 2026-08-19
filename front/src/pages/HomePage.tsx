import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { GameCard } from '../components/GameCard.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
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
  const { isLoggedIn, user, authChecked } = useAuthModal()

  /* Tant que la session n'est pas vérifiée, on garde le titre neutre : sinon un
     visiteur déjà connecté verrait « Bienvenue sur le hub » clignoter. */
  const title =
    authChecked && isLoggedIn && user ? `Bienvenue ${user.userName}` : 'Bienvenue sur le hub'

  return (
    <AppLayout current="nav:home" onNavigate={onNavigate}>
      {/* Le décor (échiquier) est propre à l'accueil : il passe par className. */}
      <PageHeader
        className={s.heroDecor}
        title={title}
        subtitle="Échecs, Blackjack et Uno : contre des bots ou en ligne, avec tes amis."
      >
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
