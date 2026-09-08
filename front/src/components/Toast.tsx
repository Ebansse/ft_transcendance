import { Button } from './Button.tsx'
import s from './Toast.module.css'

/** Une notification, quelle qu'en soit l'origine. `id` sert de clé de rendu et
 *  de poignée de fermeture : c'est à l'appelant de le rendre unique (l'UUID de
 *  l'invitation, l'id du message…). */
export type ToastItem = {
  id: string
  title: string
  body: string
}

type ToastProps = {
  items: ToastItem[]
  onDismiss: (id: string) => void
}

/** Pile de notifications, ancrée en haut à droite : chacune entre en glissant
 *  depuis le bord droit et ne repart que sur sa croix, jamais toute seule.
 *
 *  Le composant ne connaît rien du métier — invitation d'échecs, message reçu,
 *  ami ajouté passeront tous par la même liste d'`items`.
 *
 *  `role="status"` et `aria-live="polite"` plutôt que `alert`/`assertive` : une
 *  notification n'est pas une urgence, elle attend la fin de la phrase en cours
 *  du lecteur d'écran au lieu de la couper. */
export function Toast({ items, onDismiss }: ToastProps) {
  if (items.length === 0) return null

  return (
    <div className={s.stack}>
      {items.map((item) => (
        <div key={item.id} className={s.toast} role="status" aria-live="polite">
          <div className={s.head}>
            <p className={s.title}>{item.title}</p>
            <Button
              variant="ghost"
              ariaLabel="Fermer la notification"
              onClick={() => onDismiss(item.id)}
            >
              ✕
            </Button>
          </div>

          <p className={s.body}>{item.body}</p>
        </div>
      ))}
    </div>
  )
}
