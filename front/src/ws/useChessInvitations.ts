import { useCallback, useEffect, useState } from 'react'
import type { ToastItem } from '../components/Toast.tsx'
import { CHESS_INVITATIONS, type ChessInvitationDto } from '../lib/chessClient.ts'
import { useSocket } from './socketContext.ts'

/** Traduit une invitation en notification. Une seule queue sert les deux sens
 *  de la conversation, l'état les sépare : `PENDING` arrive chez l'invité,
 *  `DECLINED` chez l'inviteur. */
function toToast(invitation: ChessInvitationDto): ToastItem {
  if (invitation.state === 'DECLINED') {
    return {
      id: invitation.invitationId,
      title: 'Invitation refusée',
      body: `${invitation.fromUsername} a refusé ta partie d’échecs.`,
    }
  }

  return {
    id: invitation.invitationId,
    title: 'Invitation aux échecs',
    body: `${invitation.fromUsername} t’invite à une partie d’échecs.`,
  }
}

/** Écoute les invitations d'échecs et les tient en pile, prêtes à être passées
 *  à `<Toast>`. Rien ne se ferme tout seul : `dismiss` est le seul retrait,
 *  déclenché par la croix.
 *
 *  Appelé une seule fois, dans App : la socket vit au-dessus des routes, donc
 *  l'invitation arrive quelle que soit la page ouverte. */
export function useChessInvitations() {
  const { subscribe } = useSocket()
  const [invitations, setInvitations] = useState<ToastItem[]>([])

  // `subscribe` renvoie déjà sa fonction de désinscription, et sa référence est
  // stable (useCallback sans dépendance dans SocketProvider) : l'effet ne se
  // rejoue pas à chaque rendu, et le registre du provider replace la
  // souscription à chaque reconnexion — rien à refaire ici.
  useEffect(
    () =>
      subscribe(CHESS_INVITATIONS, (body) => {
        const invitation = JSON.parse(body) as ChessInvitationDto
        setInvitations((previous) => [...previous, toToast(invitation)])
      }),
    [subscribe],
  )

  const dismiss = useCallback((id: string) => {
    setInvitations((previous) => previous.filter((item) => item.id !== id))
  }, [])

  return { invitations, dismiss }
}
