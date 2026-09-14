import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ToastItem } from '../components/Toast.tsx'
import { acceptChessInvitation, declineChessInvitation } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import { CHESS_INVITATIONS, type ChessInvitationDto } from '../lib/chessClient.ts'
import { useSocket } from './socketContext.ts'

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

/** Écoute les invitations d'échecs et les tient en pile, prêtes à être passées
 *  à `<Toast>`. Rien ne se ferme tout seul : le retrait vient de la croix, ou
 *  d'une réponse (accepter / refuser) partie sans erreur.
 *
 *  Une seule queue sert les deux sens de la conversation, l'état les sépare :
 *  `PENDING` arrive chez l'invité — avec ses deux boutons — et `DECLINED` chez
 *  l'inviteur, en simple information.
 *
 *  Appelé une seule fois, dans App : la socket vit au-dessus des routes, donc
 *  l'invitation arrive quelle que soit la page ouverte. */
export function useChessInvitations() {
  const { subscribe } = useSocket()
  const navigate = useNavigate()
  const [invitations, setInvitations] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setInvitations((previous) => previous.filter((item) => item.id !== id))
  }, [])

  /** Répond au back puis retire le toast. En cas de refus (invitation expirée,
   *  déjà traitée, adversaire déconnecté…) le toast reste affiché mais perd ses
   *  boutons : il n'y a plus rien à retenter, seulement une raison à lire. */
  const respond = useCallback(
    async (id: string, opponent: string, accept: boolean) => {
      try {
        if (accept) {
          await acceptChessInvitation(opponent)
          // La partie existe maintenant côté back : la page Échecs la retrouve
          // toute seule avec GET /chess/matches/me.
          navigate('/chess')
        } else {
          await declineChessInvitation(opponent)
        }
        setInvitations((previous) => previous.filter((item) => item.id !== id))
      } catch (err: unknown) {
        setInvitations((previous) =>
          previous.map((item) =>
            item.id === id
              ? { ...item, body: messageOf(err, 'Action impossible.'), actions: undefined }
              : item,
          ),
        )
      }
    },
    [navigate],
  )

  /** `subscribe` renvoie déjà sa fonction de désinscription, et sa référence est
   *  stable (useCallback sans dépendance dans SocketProvider) : l'effet ne se
   *  rejoue pas à chaque rendu, et le registre du provider replace la
   *  souscription à chaque reconnexion — rien à refaire ici. */
  useEffect(
    () =>
      subscribe(CHESS_INVITATIONS, (body) => {
        const invitation = JSON.parse(body) as ChessInvitationDto
        setInvitations((previous) => [...previous, toToast(invitation, respond)])
      }),
    [subscribe, respond],
  )

  return { invitations, dismiss }
}

/** Traduit une invitation en notification : refus reçu = information sèche,
 *  invitation reçue = deux boutons. */
function toToast(
  invitation: ChessInvitationDto,
  respond: (id: string, opponent: string, accept: boolean) => Promise<void>,
): ToastItem {
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
    body: `${invitation.fromUsername} t’invite à une partie d’échecs : tu joueras les ${
      invitation.fromSide === 'BLACK' ? 'blancs' : 'noirs'
    }.`,
    actions: [
      {
        label: 'Accepter',
        tone: 'accept',
        onClick: () => respond(invitation.invitationId, invitation.fromUsername, true),
      },
      {
        label: 'Refuser',
        tone: 'decline',
        onClick: () => respond(invitation.invitationId, invitation.fromUsername, false),
      },
    ],
  }
}
