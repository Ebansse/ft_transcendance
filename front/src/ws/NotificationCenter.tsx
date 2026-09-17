import { Toast } from '../components/Toast.tsx'
import { CHAT_TOAST_PREFIX, useChatNotifications } from './useChatNotifications.ts'
import { useChessInvitations } from './useChessInvitations.ts'
import { FRIEND_TOAST_PREFIX, useFriendNotifications } from './useFriendNotifications.ts'

/** L'unique pile de notifications de l'application. Une seule `<Toast>` : deux
 *  piles ancrées au même endroit se chevaucheraient.
 *
 *  Rendu sous `ChatProvider` (voir App) : les hooks d'amis et de chat en ont
 *  besoin. Chaque hook préfixe ses ids, ce qui permet de lui rendre la
 *  fermeture ; les invitations d'échecs gardent leur UUID nu. */
export function NotificationCenter() {
  const chess = useChessInvitations()
  const friends = useFriendNotifications()
  const chat = useChatNotifications()

  const dismiss = (id: string) => {
    if (id.startsWith(FRIEND_TOAST_PREFIX)) friends.dismiss(id)
    else if (id.startsWith(CHAT_TOAST_PREFIX)) chat.dismiss(id)
    else chess.dismiss(id)
  }

  return <Toast items={[...chess.invitations, ...friends.items, ...chat.items]} onDismiss={dismiss} />
}
