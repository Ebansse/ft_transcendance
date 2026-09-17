import { useCallback, useEffect, useState } from 'react'
import type { ToastItem } from '../components/Toast.tsx'
import { useChat } from '../chat/chatContext.ts'
import { acceptFriendRequest, declineFriendRequest } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import { FRIEND_NOTIFICATIONS, type FriendNotificationDto } from '../lib/notificationClient.ts'
import { useSocket } from './socketContext.ts'

/** Préfixe des ids de toast : `NotificationCenter` s'en sert pour savoir à quel
 *  hook rendre la fermeture. */
export const FRIEND_TOAST_PREFIX = 'friend:'

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

/** Écoute les notifications d'amis et les tient en pile pour `<Toast>`, sur le
 *  modèle de `useChessInvitations`. Chaque notification relance aussi la liste
 *  d'amis : la page Amis se met à jour sans rechargement.
 *
 *  Doit vivre sous `ChatProvider`, qui porte la liste d'amis. */
export function useFriendNotifications() {
  const { subscribe } = useSocket()
  const { refresh } = useChat()
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }, [])

  /** Même contrat que pour les échecs : succès = toast retiré, échec = toast
   *  gardé sans boutons, avec la raison. */
  const respond = useCallback(
    async (id: string, idUser: string, accept: boolean) => {
      try {
        if (accept) await acceptFriendRequest(idUser)
        else await declineFriendRequest(idUser)
        setItems((previous) => previous.filter((item) => item.id !== id))
        void refresh().catch(() => {})
      } catch (err: unknown) {
        setItems((previous) =>
          previous.map((item) =>
            item.id === id
              ? { ...item, body: messageOf(err, 'Action impossible.'), actions: undefined }
              : item,
          ),
        )
      }
    },
    [refresh],
  )

  useEffect(
    () =>
      subscribe(FRIEND_NOTIFICATIONS, (body) => {
        const notification = JSON.parse(body) as FriendNotificationDto
        const toast = toToast(notification, respond)
        // Une nouvelle demande du même compte remplace l'ancienne.
        setItems((previous) => [...previous.filter((item) => item.id !== toast.id), toast])
        void refresh().catch(() => {})
      }),
    [subscribe, respond, refresh],
  )

  return { items, dismiss }
}

function toToast(
  notification: FriendNotificationDto,
  respond: (id: string, idUser: string, accept: boolean) => Promise<void>,
): ToastItem {
  const id = `${FRIEND_TOAST_PREFIX}${notification.type}:${notification.fromUserId}`

  if (notification.type === 'REQUEST_ACCEPTED') {
    return {
      id,
      title: 'Demande acceptée',
      body: `${notification.fromUserName} a accepté ta demande d’ami.`,
    }
  }

  return {
    id,
    title: 'Demande d’ami',
    body: `${notification.fromUserName} veut t’ajouter en ami.`,
    actions: [
      {
        label: 'Accepter',
        tone: 'accept',
        onClick: () => respond(id, notification.fromUserId, true),
      },
      {
        label: 'Refuser',
        tone: 'decline',
        onClick: () => respond(id, notification.fromUserId, false),
      },
    ],
  }
}
