import { useState } from 'react'
import { Button } from './Button.tsx'
import s from './Toast.module.css'

/** `tone` ne sert qu'à la couleur : `accept` en vert, `decline` en rouge. */
export type ToastAction = {
  label: string
  /** Le toast attend la promesse pour bloquer les boutons pendant l'appel. */
  onClick: () => void | Promise<void>
  tone?: 'accept' | 'decline'
}

/** `id` sert de clé de rendu et de poignée de fermeture : à l'appelant de le
 *  rendre unique. Sans `actions`, le toast se contente d'informer. */
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

/** Pile de notifications : chacune ne repart que sur sa croix, jamais seule.
 *  Le composant ne connaît rien du métier. */
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

/** Composant à part pour qu'il porte son propre « appel en cours » : deux
 *  notifications empilées ne se bloquent pas l'une l'autre. Exporté pour la
 *  cloche, qui liste les mêmes cartes. */
export function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  /** Un double clic sur « Accepter » partirait sinon deux fois. */
  const [busy, setBusy] = useState(false)

  const run = (action: ToastAction) => {
    setBusy(true)
    // L'action peut être synchrone : Promise.resolve les traite pareil.
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
            /* Button n'accepte pas de className : le parent pose les variables
               de couleur (contrat de Button.module.css). */
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
