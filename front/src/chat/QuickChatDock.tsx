import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChatConversation } from '../components/ChatConversation.tsx'
import { useChat } from './chatContext.ts'
import s from './QuickChatDock.module.css'

const MINIMIZED_STORAGE = 'transcendence.quickchat.minimized'

function readStoredMinimized() {
  try {
    const raw = sessionStorage.getItem(MINIMIZED_STORAGE)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, flag]) => typeof flag === 'boolean',
    )
    return Object.fromEntries(entries) as Record<string, boolean>
  } catch {
    return {}
  }
}

function writeStoredMinimized(state: Record<string, boolean>) {
  try {
    sessionStorage.setItem(MINIMIZED_STORAGE, JSON.stringify(state))
  } catch {
    return
  }
}

export function QuickChatDock() {
  const { quickChatIds, closeQuickChat, nameOf, unread } = useChat()
  const [minimized, setMinimized] = useState<Record<string, boolean>>(readStoredMinimized)
  const navigate = useNavigate()

  useEffect(() => {
    writeStoredMinimized(minimized)
  }, [minimized])

  const toggle = (idUser: string) => {
    setMinimized((prev) => ({ ...prev, [idUser]: prev[idUser] !== true }))
  }

  if (quickChatIds.length === 0) return null

  return createPortal(
    <div className={s.dock} aria-live="polite">
      {quickChatIds.map((idUser) => {
        const name = nameOf(idUser)
        const isMinimized = minimized[idUser] === true
        const count = unread[idUser] ?? 0

        return (
          <section
            key={idUser}
            className={isMinimized ? `${s.window} ${s.windowMinimized}` : s.window}
            aria-label={`Quick chat avec ${name}`}
          >
            <header className={s.header}>
              <button
                type="button"
                className={s.title}
                onClick={() => toggle(idUser)}
                aria-expanded={!isMinimized}
              >
                <span className={s.titleText}>{name}</span>
                {isMinimized && count > 0 && <span className={s.badge}>{count}</span>}
              </button>

              <div className={s.headerActions}>
                <button
                  type="button"
                  className={s.iconButton}
                  onClick={() => navigate(`/chat/${idUser}`)}
                  aria-label={`Ouvrir la conversation avec ${name} en pleine page`}
                >
                  ↗
                </button>
                <button
                  type="button"
                  className={s.iconButton}
                  onClick={() => toggle(idUser)}
                  aria-label={isMinimized ? `Agrandir ${name}` : `Réduire ${name}`}
                >
                  {isMinimized ? '▴' : '▾'}
                </button>
                <button
                  type="button"
                  className={s.iconButton}
                  onClick={() => closeQuickChat(idUser)}
                  aria-label={`Fermer le quick chat avec ${name}`}
                >
                  ×
                </button>
              </div>
            </header>

            {!isMinimized && (
              <div className={s.body}>
                <ChatConversation targetId={idUser} targetName={name} compact />
              </div>
            )}
          </section>
        )
      })}
    </div>,
    document.body,
  )
}