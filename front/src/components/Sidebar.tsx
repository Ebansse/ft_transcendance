import { useMemo } from 'react'
import { Button } from './Button.tsx'
import { useAuthModal } from '../auth/authModalContext.ts'
import { useChat } from '../chat/chatContext.ts'
import { handleAction } from '../lib/actions.ts'
import s from './Sidebar.module.css'

type NavItem = {
  action: string
  label: string
  icon: string
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    title: 'Navigation',
    items: [{ action: 'nav:home', label: 'Accueil', icon: '🏠' }],
  },
  {
    title: 'Jeux',
    items: [{ action: 'nav:chess', label: 'Échecs', icon: '♟️' }],
  },
  {
    title: 'Social',
    items: [
      { action: 'nav:friends', label: 'Amis', icon: '👥' },
      { action: 'nav:chat', label: 'Chat', icon: '💬' },
    ],
  },
  {
    title: 'Compte',
    items: [
      { action: 'nav:stats', label: 'Stats & historique', icon: '📊' },
      { action: 'nav:profile', label: 'Profil', icon: '🙂' },
      { action: 'nav:settings', label: 'Paramètres', icon: '⚙️' },
    ],
  },
]

const ADMIN_GROUP: NavGroup = {
  title: 'Administration',
  items: [{ action: 'nav:admin', label: 'Admin', icon: '🛡️' }],
}

type SidebarProps = {
  open: boolean
  current?: string
  onNavigate?: (action: string) => void
}

export function Sidebar({ open, current = 'nav:home', onNavigate = handleAction }: SidebarProps) {
  const { user } = useAuthModal()
  const { rows, unread } = useChat()

  const groups = user?.role === 'ADMIN' ? [...GROUPS, ADMIN_GROUP] : GROUPS
  const badges = useBadges()

  const pendingRequests = rows.filter(
    (row) => row.status === 'PENDING' && row.senderId === row.idUser,
  ).length

  const unreadMessages = Object.values(unread).reduce((total, count) => total + count, 0)

  const badgeOf = (action: string) => {
    if (action === 'nav:friends') return pendingRequests
    if (action === 'nav:chat') return unreadMessages
    return 0
  }

  return (
    <aside
      id="sidebar"
      className={open ? `${s.sidebar} ${s.open}` : s.sidebar}
      aria-label="Menu principal"
    >
      {groups.map((group) => (
        <nav key={group.title} className={s.group} aria-label={group.title}>
          <p className={s.groupTitle}>{group.title}</p>
          <ul className={s.list}>
            {group.items.map((item) => (
              <li key={item.action}>
                <span className={item.action === current ? `${s.item} ${s.itemActive}` : s.item}>
                  <Button variant="nav" fullWidth onClick={() => onNavigate(item.action)}>
                    <span aria-hidden="true" className={s.icon}>
                      {item.icon}
                    </span>
                    <span className={s.label}>{item.label}</span>
                    {badges[item.action] ? (
                      <span className={s.badge}>
                        {badges[item.action]}
                        <span className="sr-only"> {BADGE_LABELS[item.action]}</span>
                      </span>
                      <span className={s.label}>{item.label}</span>
                      {badge > 0 ? (
                        <span className={s.badge}>
                          {badge}
                          <span className="sr-only"> notifications</span>
                        </span>
                      ) : null}
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        </nav>
      ))}
    </aside>
  )
}

/** Ce que compte chaque pastille, pour les lecteurs d'écran. */
const BADGE_LABELS: Record<string, string> = {
  'nav:friends': 'demandes d’ami en attente',
  'nav:chat': 'messages non lus',
}

/** Les deux pastilles du menu, tenues par `ChatProvider` et donc à jour en
 *  temps réel : `rows` est relancé à chaque notification d'ami (voir
 *  `useFriendNotifications`) et `unread` est incrémenté à chaque message reçu,
 *  puis remis à zéro quand la conversation est ouverte.
 *
 *  Une demande est *reçue* quand son expéditeur est l'autre bout de la relation :
 *  `senderId === idUser`. Celles qu'on a envoyées ne comptent pas. */
function useBadges() {
  const { rows, unread } = useChat()

  return useMemo(() => {
    const requests = rows.filter(
      (row) => row.status === 'PENDING' && row.senderId === row.idUser,
    ).length
    const messages = Object.values(unread).reduce((total, count) => total + count, 0)

    return { 'nav:friends': requests, 'nav:chat': messages } as Record<string, number>
  }, [rows, unread])
}
