import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Client } from '@stomp/stompjs'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { getFriendList, type FriendListDto } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import { createChatClient, sendChatMessage, type ChatMessageDto } from '../lib/chatClient.ts'
import s from './ChatPage.module.css'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

/** `sentAt` est un `LocalDateTime` Java sans fuseau : affiché tel quel, dans
 *  le fuseau du navigateur. */
function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** La clé d'une conversation est toujours l'id de *l'autre* personne, qu'on
 *  soit l'émetteur ou le destinataire du message. */
function conversationKey(message: ChatMessageDto, myId: string) {
  return message.senderId === myId ? message.receiverId : message.senderId
}

type ChatPageProps = {
  onNavigate: (action: string) => void
}

export function ChatPage({ onNavigate }: ChatPageProps) {
  const { isLoggedIn, authChecked, user } = useAuthModal()
  const myId = user?.id ?? null

  const [friends, setFriends] = useState<FriendListDto[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Un fil par ami, gardé en mémoire le temps de la session : pas d'historique
  // persistant côté back pour l'instant, donc rien avant l'ouverture de la page.
  const [threads, setThreads] = useState<Record<string, ChatMessageDto[]>>({})

  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [chatError, setChatError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const clientRef = useRef<Client | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Charge la liste d'amis, comme sur FriendsPage — seuls les ACCEPTED
  // peuvent recevoir un message (voir ChatService.sendMessage côté back).
  useEffect(() => {
    if (!isLoggedIn) return

    let alive = true
    setFriendsLoading(true)
    setFriendsError(null)

    getFriendList()
      .then((list) => {
        if (alive) setFriends(list.filter((row) => row.status === 'ACCEPTED'))
      })
      .catch((err: unknown) => {
        if (alive) setFriendsError(messageOf(err, 'Chargement de la liste d’amis impossible.'))
      })
      .finally(() => {
        if (alive) setFriendsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [isLoggedIn])

  // Une seule connexion STOMP pour toute la page : elle reçoit les messages de
  // tous les amis, pas seulement de la conversation ouverte.
  useEffect(() => {
    if (!isLoggedIn || !myId) return

    const client = createChatClient({
      onStatusChange: setStatus,
      onError: setChatError,
      onMessage: (message) => {
        const key = conversationKey(message, myId)
        setThreads((prev) => ({
          ...prev,
          [key]: [...(prev[key] ?? []), message],
        }))
      },
    })
    clientRef.current = client

    return () => {
      clientRef.current = null
      void client.deactivate()
    }
  }, [isLoggedIn, myId])

  const activeMessages = useMemo(
    () => (selectedId ? (threads[selectedId] ?? []) : []),
    [threads, selectedId],
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [activeMessages.length])

  const handleSend = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      const content = draft.trim()
      const client = clientRef.current
      if (!content || !selectedId || !client || status !== 'connected') return

      sendChatMessage(client, selectedId, content)
      setDraft('')
    },
    [draft, selectedId, status],
  )

  const selectedFriend = friends.find((friend) => friend.idUser === selectedId) ?? null

  const statusLabel =
    status === 'connecting'
      ? 'Connexion au chat…'
      : status === 'disconnected'
        ? 'Connexion perdue, nouvelle tentative…'
        : null

  return (
    <AppLayout current="nav:chat" onNavigate={onNavigate}>
      <PageHeader title="Messages" subtitle="Discute en direct avec tes amis." />

      {!authChecked ? null : !isLoggedIn ? (
        <p className={s.denied}>Connecte-toi pour accéder à la messagerie.</p>
      ) : (
        <div className={s.layout}>
          <aside className={s.sidebar} aria-labelledby="chat-friends-title">
            <SectionTitle id="chat-friends-title">Amis ({friends.length})</SectionTitle>

            {friendsLoading && <p className={s.state}>Chargement…</p>}
            {friendsError && <p className={s.error}>{friendsError}</p>}

            {!friendsLoading && !friendsError && friends.length === 0 && (
              <p className={s.state}>Ajoute des amis pour pouvoir discuter.</p>
            )}

            <ul className={s.friendList}>
              {friends.map((friend) => (
                <li key={friend.idUser}>
                  <button
                    type="button"
                    className={
                      friend.idUser === selectedId
                        ? `${s.friendButton} ${s.friendButtonActive}`
                        : s.friendButton
                    }
                    onClick={() => setSelectedId(friend.idUser)}
                  >
                    {friend.userName}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className={s.conversation} aria-label="Conversation">
            {!selectedFriend ? (
              <p className={s.state}>Choisis un ami dans la liste pour démarrer la discussion.</p>
            ) : (
              <>
                <header className={s.conversationHeader}>
                  <h2 className={s.conversationTitle}>{selectedFriend.userName}</h2>
                </header>

                <div className={s.messages}>
                  {activeMessages.length === 0 ? (
                    <p className={s.state}>Aucun message pour l’instant. Dis bonjour !</p>
                  ) : (
                    activeMessages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.senderId === myId ? `${s.bubble} ${s.bubbleMine}` : s.bubble
                        }
                      >
                        <p className={s.bubbleContent}>{message.content}</p>
                        <span className={s.bubbleTime}>{formatTime(message.sentAt)}</span>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {chatError && <p className={s.error}>{chatError}</p>}
                {statusLabel && <p className={s.state}>{statusLabel}</p>}

                <form className={s.form} onSubmit={handleSend}>
                  <label className={s.srOnly} htmlFor="chat-input">
                    Message
                  </label>
                  <input
                    id="chat-input"
                    className={s.input}
                    type="text"
                    value={draft}
                    maxLength={1000}
                    autoComplete="off"
                    placeholder={`Écrire à ${selectedFriend.userName}…`}
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={status !== 'connected'}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={status !== 'connected' || !draft.trim()}
                  >
                    Envoyer
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  )
}