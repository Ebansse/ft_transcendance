import s from './InfoCard.module.css'

type InfoCardProps = {
  title: string
  text: string
}

/** Carte descriptive, sans action : sert à présenter une section. */
export function InfoCard({ title, text }: InfoCardProps) {
  return (
    <article className={s.card}>
      <h3 className={s.title}>{title}</h3>
      <p className={s.text}>{text}</p>
    </article>
  )
}
