/** Files STOMP des notifications, poussées par `NotificationService` côté back.
 *  Rien n'est stocké : un compte hors ligne ne reçoit rien, il retrouve l'état
 *  sur la page Amis ou dans l'historique du chat. */
export const FRIEND_NOTIFICATIONS = '/user/queue/notifications.friends'
export const CHAT_NOTIFICATIONS = '/user/queue/notifications.chat'

/** Miroir du `FriendNotificationDto`. `fromUserId` désigne toujours l'autre
 *  bout de la relation : c'est l'id que prennent les routes `/friend-list`. */
export type FriendNotificationDto = {
  type: 'REQUEST_RECEIVED' | 'REQUEST_ACCEPTED'
  fromUserId: string
  fromUserName: string
}

/** Miroir du `ChatNotificationDto` : envoyé au seul destinataire d'un message,
 *  avec un aperçu déjà tronqué par le back. */
export type ChatNotificationDto = {
  messageId: number
  senderId: string
  senderUserName: string
  preview: string
  sentAt: string
}
