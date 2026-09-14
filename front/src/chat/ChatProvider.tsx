import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { getFriendList, type FriendListDto } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import {
  CHAT_ERRORS,
  CHAT_MESSAGES,
  getChatHistory,
  markConversationRead,
  mergeMessages,
  sendChatMessage,
  type ChatMessageDto,
} from '../lib/chatClient.ts'
import { useSocket } from '../ws/socketContext.ts'
import { ChatContext, EMPTY_HISTORY, type ChatValue, type ThreadHistory } from './chatContext.ts'

const MAX_QUICK_CHATS = 3

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

function conversationKey(message: ChatMessageDto, myId: string) {
  return message.senderId === myId ? message.receiverId : message.senderId
}

type ChatProviderProps = {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { isLoggedIn, user } = useAuthModal()
  const { subscribe, publish } = useSocket()
  const myId = user?.id ?? null

  const [rows, setRows] = useState<FriendListDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [threads, setThreads] = useState<Record<string, ChatMessageDto[]>>({})
  const [history, setHistory] = useState<Record<string, ThreadHistory>>({})
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [chatError, setChatError] = useState<string | null>(null)
  const [quickChatIds, setQuickChatIds] = useState<string[]>([])

  const threadsRef = useRef(threads)
  const historyRef = useRef(history)
  const unreadRef = useRef(unread)
  const myIdRef = useRef(myId)
  const markedRef = useRef<Record<string, number>>({})

  useEffect(() => {
    threadsRef.current = threads
  }, [threads])

  useEffect(() => {
    historyRef.current = history
  }, [history])

  useEffect(() => {
    unreadRef.current = unread
  }, [unread])

  useEffect(() => {
    myIdRef.current = myId
  }, [myId])

  const refresh = useCallback(async () => {
    setRows(await getFriendList())
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      setRows([])
      setThreads({})
      setHistory({})
      setUnread({})
      setQuickChatIds([])
      markedRef.current = {}
      return
    }

    let alive = true
    setLoading(true)
    setError(null)

    getFriendList()
      .then((list) => {
        if (alive) setRows(list)
      })
      .catch((err: unknown) => {
        if (alive) setError(messageOf(err, 'Chargement de la liste d’amis impossible.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!myId) return

    const unsubscribeMessages = subscribe(CHAT_MESSAGES, (body) => {
      const message = JSON.parse(body) as ChatMessageDto
      const key = conversationKey(message, myId)

      setThreads((prev) => ({
        ...prev,
        [key]: mergeMessages(prev[key] ?? [], [message]),
      }))

      if (message.senderId !== myId) {
        setUnread((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }))
      }
    })

    const unsubscribeErrors = subscribe(CHAT_ERRORS, (body) => {
      const payload = JSON.parse(body) as { error?: string }
      setChatError(payload.error ?? 'Message refusé par le serveur.')
    })

    return () => {
      unsubscribeMessages()
      unsubscribeErrors()
    }
  }, [subscribe, myId])

  const fetchPage = useCallback(async (idUser: string, before: number | null) => {
    setHistory((prev) => ({
      ...prev,
      [idUser]: { ...(prev[idUser] ?? EMPTY_HISTORY), loading: true, error: null },
    }))

    try {
      const page = await getChatHistory(idUser, before)

      setThreads((prev) => ({
        ...prev,
        [idUser]: mergeMessages(prev[idUser] ?? [], page.messages),
      }))

      setHistory((prev) => ({
        ...prev,
        [idUser]: {
          loading: false,
          loaded: true,
          hasMore: page.hasMore,
          cursor: page.nextCursor ?? null,
          error: null,
        },
      }))
    } catch (err) {
      setHistory((prev) => ({
        ...prev,
        [idUser]: {
          ...(prev[idUser] ?? EMPTY_HISTORY),
          loading: false,
          error: messageOf(err, 'Chargement de l’historique impossible.'),
        },
      }))
    }
  }, [])

  const loadHistory = useCallback(
    (idUser: string) => {
      const state = historyRef.current[idUser]
      if (state?.loaded === true || state?.loading === true) return
      void fetchPage(idUser, null)
    },
    [fetchPage],
  )

  const loadOlder = useCallback(
    (idUser: string) => {
      const state = historyRef.current[idUser]
      if (!state || state.loading || !state.hasMore || state.cursor === null) return
      void fetchPage(idUser, state.cursor)
    },
    [fetchPage],
  )

  const historyOf = useCallback((idUser: string) => history[idUser] ?? EMPTY_HISTORY, [history])

  const friends = useMemo(() => rows.filter((row) => row.status === 'ACCEPTED'), [rows])

  const nameOf = useCallback(
    (idUser: string) => rows.find((row) => row.idUser === idUser)?.userName ?? 'Utilisateur',
    [rows],
  )

  const recentIds = useMemo(() => {
    return Object.entries(threads)
      .filter(([, messages]) => messages.length > 0)
      .map(([idUser, messages]) => ({
        idUser,
        at: new Date(messages[messages.length - 1].sentAt).getTime(),
      }))
      .sort((a, b) => b.at - a.at)
      .map((entry) => entry.idUser)
  }, [threads])

  const markRead = useCallback((idUser: string) => {
    if (unreadRef.current[idUser]) {
      setUnread((prev) => (prev[idUser] ? { ...prev, [idUser]: 0 } : prev))
    }

    const thread = threadsRef.current[idUser] ?? []
    const mine = myIdRef.current
    let lastIncoming: ChatMessageDto | null = null
    for (let index = thread.length - 1; index >= 0; index -= 1) {
      if (thread[index].senderId !== mine) {
        lastIncoming = thread[index]
        break
      }
    }

    if (!lastIncoming) return
    if (markedRef.current[idUser] === lastIncoming.id) return

    markedRef.current[idUser] = lastIncoming.id
    void markConversationRead(idUser).catch(() => {})
  }, [])

  const clearChatError = useCallback(() => setChatError(null), [])

  const send = useCallback(
    (receiverId: string, content: string) => {
      const sent = sendChatMessage(publish, receiverId, content)
      setChatError(sent ? null : 'Message non envoyé : connexion au chat indisponible.')
      return sent
    },
    [publish],
  )

  const openQuickChat = useCallback((idUser: string) => {
    setQuickChatIds((prev) => {
      if (prev.includes(idUser)) return prev
      const next = [...prev, idUser]
      return next.length > MAX_QUICK_CHATS ? next.slice(next.length - MAX_QUICK_CHATS) : next
    })
    setUnread((prev) => (prev[idUser] ? { ...prev, [idUser]: 0 } : prev))
  }, [])

  const closeQuickChat = useCallback((idUser: string) => {
    setQuickChatIds((prev) => prev.filter((id) => id !== idUser))
  }, [])

  const value: ChatValue = {
    myId,
    rows,
    friends,
    loading,
    error,
    refresh,
    nameOf,
    threads,
    history,
    historyOf,
    loadHistory,
    loadOlder,
    unread,
    recentIds,
    chatError,
    clearChatError,
    markRead,
    send,
    quickChatIds,
    openQuickChat,
    closeQuickChat,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}