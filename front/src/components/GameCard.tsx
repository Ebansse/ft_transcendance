import { Button } from './Button.tsx'
import { handleAction } from '../lib/actions.ts'

type GameCardProps = {
  name: string
  description: string
  icon: string
  /** Identifiant du jeu, utilisé pour construire l'action (ex: "chess"). */
  slug: string
  playersOnline: number
}

export function GameCard({ name, description, icon, slug, playersOnline }: GameCardProps) {
  return (
    <article className="game-card">
      <span className="game-card-icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="game-card-title">{name}</h3>
      <p className="game-card-desc">{description}</p>
      <p className="game-card-online">{playersOnline} joueurs en ligne</p>
      <div className="game-card-actions">
        <Button variant="primary" fullWidth onClick={() => handleAction(`play:${slug}:online`)}>
          Partie en ligne
        </Button>
        <Button variant="secondary" fullWidth onClick={() => handleAction(`play:${slug}:bot`)}>
          Jouer contre un bot
        </Button>
      </div>
    </article>
  )
}
