import { useState } from 'react'
import { Button } from './Button.tsx'
import s from './Toast.module.css'

/** Un bouton d'action au pied d'une notification. `tone` ne sert qu'à la
 *  couleur : `accept` en vert, `decline` en rouge, rien = neutre. */
export type ToastAction = {
  label: string
  /** Le toast attend la promesse pour bloquer les boutons pendant l'appel. */
  onClick: () => void | Promise<void>
  tone?: 'accept' | 'decline'
}

/** Une notification, quelle qu'en soit l'origine. `id` sert de clé de rendu et
 *  de poignée de fermeture : c'est à l'appelant de le rendre unique (l'UUID de
 *  l'invitation, l'id du message…). `actions` est optionnel : sans lui, le
 *  toast se contente d'informer. */
export type ToastItem = {
  id: string
  title: string
  body: string
  actions?: ToastAction[]
}

type ToastProps = {
  items: ToastItem[]
  onDismiss: (id: string) => void
}

/** Pile de notifications, ancrée en haut à droite : chacune entre en glissant
 *  depuis le bord droit et ne repart que sur sa croix, jamais toute seule.
 *
 *  Le composant ne connaît rien du métier — invitation d'échecs, message reçu,
 *  ami ajouté passeront tous par la même liste d'`items`. */
export function Toast({ items, onDismiss }: ToastProps) {
  if (items.length === 0) return null

  return (
    <div className={s.stack}>
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

/** Un rectangle. Composant à part pour qu'il porte son propre « appel en
 *  cours » : deux notifications empilées ne se bloquent pas l'une l'autre.
 *
 *  `role="status"` et `aria-live="polite"` plutôt que `alert`/`assertive` : une
 *  notification n'est pas une urgence, elle attend la fin de la phrase en cours
 *  du lecteur d'écran au lieu de la couper. */
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  /** Verrouille les deux boutons le temps de l'aller-retour : un double clic
   *  sur « Accepter » partirait sinon deux fois. */
  const [busy, setBusy] = useState(false)

  const run = (action: ToastAction) => {
    setBusy(true)
    /* `Promise.resolve` : l'action peut être synchrone, on la traite pareil. */
    void Promise.resolve(action.onClick()).finally(() => setBusy(false))
  }

  return (
    <div className={s.toast} role="status" aria-live="polite">
      <div className={s.head}>
        <p className={s.title}>{item.title}</p>
        <Button variant="ghost" ariaLabel="Fermer la notification" onClick={() => onDismiss(item.id)}>
          ✕
        </Button>
      </div>

      <p className={s.body}>{item.body}</p>

      {item.actions !== undefined && item.actions.length > 0 && (
        <div className={s.actions}>
          {item.actions.map((action) => (
            /* `Button` n'accepte pas de className : c'est le parent qui pose
               les variables de couleur (contrat de Button.module.css). */
            <span key={action.label} className={action.tone ? s[action.tone] : undefined}>
              <Button variant="secondary" fullWidth disabled={busy} onClick={() => run(action)}>
                {action.label}
              </Button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
