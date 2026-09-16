import { Button } from './Button.tsx'
import { handleAction } from '../lib/actions.ts'
import s from './GameCard.module.css'

type GameCardProps = {
  name: string
  description: string
  icon: string
  slug: string
  playersOnline: number
  onPlay?: () => void
}

export function GameCard({
  name,
  description,
  icon,
  slug,
  playersOnline,
  onPlay,
}: GameCardProps) {
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
        <Button
          variant="primary"
          fullWidth
          ariaLabel={`Jouer à ${name}`}
          onClick={onPlay ?? (() => handleAction(`play:${slug}`))}
        >
          Jouer
        </Button>
      </div>
    </article>
  )
}