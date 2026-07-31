import { Button } from './Button.tsx'
import { handleAction } from '../lib/actions.ts'
import s from './GameCard.module.css'

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
    <article className={s.card}>
      <span className={s.icon} aria-hidden="true">
        {icon}
      </span>
      <h3 className={s.title}>{name}</h3>
      <p className={s.desc}>{description}</p>
      <p className={playersOnline > 0 ? `${s.online} ${s.isLive}` : s.online}>
        {playersOnline} joueurs en ligne
      </p>
      <div className={s.actions}>
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
