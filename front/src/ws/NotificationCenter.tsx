import { useState, type ReactNode } from 'react'
import { Toast } from '../components/Toast.tsx'
import { NotificationContext, type Notification } from './notificationContext.ts'
import { CHAT_TOAST_PREFIX, useChatNotifications } from './useChatNotifications.ts'
import { useChessInvitations } from './useChessInvitations.ts'
import { FRIEND_TOAST_PREFIX, useFriendNotifications } from './useFriendNotifications.ts'

/** L'unique source des notifications : une seule pile de toasts (deux
 *  `<Toast>` ancrées au même endroit se chevaucheraient) et, via le contexte,
 *  la cloche de la navbar. Chaque hook préfixe ses ids pour qu'on sache à qui
 *  rendre la fermeture ; les invitations d'échecs gardent leur UUID nu. */
export function NotificationCenter({ children }: { children: ReactNode }) {
  const chess = useChessInvitations()
  const friends = useFriendNotifications()
  const chat = useChatNotifications()

  /** La croix d'un toast ne fait que le masquer : la notification reste dans
   *  la cloche. On retient l'objet et non l'id, pour qu'une notification
   *  réécrite (nouveau message, erreur) ressorte en toast. */
  const [hidden, setHidden] = useState<ReadonlySet<Notification>>(new Set())

  const items = [...chess.invitations, ...friends.items, ...chat.items]

  const dismiss = (id: string) => {
    if (id.startsWith(FRIEND_TOAST_PREFIX)) friends.dismiss(id)
    else if (id.startsWith(CHAT_TOAST_PREFIX)) chat.dismiss(id)
    else chess.dismiss(id)
  }

  const hide = (id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    if (item) setHidden((previous) => new Set(previous).add(item))
  }

  return (
    <NotificationContext.Provider value={{ items, dismiss }}>
      <Toast items={items.filter((item) => item.popup && !hidden.has(item))} onDismiss={hide} />
      {children}
    </NotificationContext.Provider>
  )
}
