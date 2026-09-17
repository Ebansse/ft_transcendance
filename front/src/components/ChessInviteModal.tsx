import { useEffect, useState } from 'react'
import { Button } from './Button.tsx'
import { useDialog } from './useDialog.ts'
import { getFriendList, type FriendListDto } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import type { ChessSide } from '../lib/chessClient.ts'
import s from './ChessInviteModal.module.css'

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

type ChessInviteModalProps = {
  open: boolean
  /** Pseudo dont l'invitation est en cours d'envoi, `null` sinon : on verrouille
   *  toute la liste le temps de la requête pour éviter les doubles invitations. */
  pending?: string | null
  /** Refus du back (adversaire déjà en partie, invitation en double…) ; la modale
   *  reste ouverte pour que le message soit lisible. */
  error?: string | null
  onClose: () => void
  /** `side` à `null` : le back tire la couleur au sort. */
  onInvite: (userName: string, side: ChessSide | null) => void
}

/** Choix du camp puis de l'adversaire pour une partie d'échecs : un bouton par ami.
 *
 *  La liste n'est chargée qu'à l'ouverture, et rechargée à chaque réouverture :
 *  une amitié acceptée entre-temps doit apparaître sans recharger la page. */
export function ChessInviteModal({
  open,
  pending = null,
  error,
  onClose,
  onInvite,
}: ChessInviteModalProps) {
  // Le focus part sur le premier bouton de la modale, la croix de fermeture.
  const dialog = useDialog(open, 'button', onClose)

  const [side, setSide] = useState<ChessSide | null>('WHITE')
  const [friends, setFriends] = useState<FriendListDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Seuls les ACCEPTED sont invitables : une demande en attente ou refusée ne
  // désigne pas encore un ami. Même filtre que ChatPage et FriendsPage.
  useEffect(() => {
    if (!open) return

    let alive = true
    setLoading(true)
    setLoadError(null)

    getFriendList()
      .then((list) => {
        if (alive) setFriends(list.filter((row) => row.status === 'ACCEPTED'))
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(messageOf(err, 'Chargement de la liste d’amis impossible.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [open])

  return (
    <dialog {...dialog} className={s.dialog} aria-labelledby="chess-invite-title">
      <div className={s.head}>
        <h2 id="chess-invite-title" className={s.title}>
          Inviter un(e) ami(e)
        </h2>
        <Button variant="ghost" ariaLabel="Fermer" onClick={onClose}>
          ✕
        </Button>
      </div>

      {/* Même sélecteur que la modale du bot : le camp se choisit avant l'ami,
          l'invité recevra l'autre couleur. */}
      <div className={s.field}>
        <span className={s.label} id="chess-invite-side">
          Votre camp
        </span>
        <div className={s.sides} role="group" aria-labelledby="chess-invite-side">
          <Button
            variant={side === 'WHITE' ? 'primary' : 'secondary'}
            fullWidth
            disabled={pending !== null}
            onClick={() => setSide('WHITE')}
          >
            Blancs
          </Button>
          <Button
            variant={side === 'BLACK' ? 'primary' : 'secondary'}
            fullWidth
            disabled={pending !== null}
            onClick={() => setSide('BLACK')}
          >
            Noirs
          </Button>
          <Button
            variant={side === null ? 'primary' : 'secondary'}
            fullWidth
            disabled={pending !== null}
            onClick={() => setSide(null)}
          >
            Aléatoire
          </Button>
        </div>
      </div>

      {loading && <p className={s.status}>Chargement…</p>}

      {!loading && loadError && (
        <p className={s.globalError} role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && friends.length === 0 && (
        <p className={s.status}>Aucun ami à inviter pour l’instant.</p>
      )}

      {!loading && !loadError && friends.length > 0 && (
        <ul className={s.friendList}>
          {friends.map((friend) => (
            <li key={friend.idUser}>
              <Button
                variant="secondary"
                fullWidth
                disabled={pending !== null}
                onClick={() => onInvite(friend.userName, side)}
              >
                {pending === friend.userName ? 'Envoi…' : friend.userName}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className={s.globalError} role="alert">
          {error}
        </p>
      )}
    </dialog>
  )
}
