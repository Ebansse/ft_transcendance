import { Button } from './Button.tsx'
import s from './GameCard.module.css'

type GameCardProps = {
  name: string
  description: string
  icon: string
  onPlay: () => void
}

export function GameCard({ name, description, icon, onPlay }: GameCardProps) {
  return (
    <article className={s.card}>
      <span className={s.icon} aria-hidden="true">
        {icon}
      </span>
      <h3 className={s.title}>{name}</h3>
      <p className={s.desc}>{description}</p>
      <div className={s.actions}>
        <Button variant="primary" fullWidth ariaLabel={`Jouer à ${name}`} onClick={onPlay}>
          Jouer
        </Button>
      </div>
    </article>
  )
}
