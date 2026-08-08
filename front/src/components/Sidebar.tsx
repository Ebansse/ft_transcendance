import { Button } from './Button.tsx'
import { useAuthModal } from '../auth/authModalContext.ts'
import { handleAction } from '../lib/actions.ts'
import s from './Sidebar.module.css'

type NavItem = {
  action: string
  label: string
  icon: string
  badge?: number
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
    items: [
      { action: 'nav:chess', label: 'Échecs', icon: '♟️' },
      { action: 'nav:blackjack', label: 'Blackjack', icon: '🃏' },
      { action: 'nav:uno', label: 'Uno', icon: '🎴' },
    ],
  },
  {
    title: 'Social',
    items: [
      { action: 'nav:friends', label: 'Amis', icon: '👥', badge: 1 },
      { action: 'nav:chat', label: 'Chat', icon: '💬', badge: 1 },
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

/** Groupe réservé aux comptes ADMIN, ajouté en bas du menu. */
const ADMIN_GROUP: NavGroup = {
  title: 'Administration',
  items: [{ action: 'nav:admin', label: 'Admin', icon: '🛡️' }],
}

type SidebarProps = {
  open: boolean
  current?: string
}

export function Sidebar({ open, current = 'nav:home' }: SidebarProps) {
  const { user } = useAuthModal()
  const groups = user?.role === 'ADMIN' ? [...GROUPS, ADMIN_GROUP] : GROUPS

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
                  <Button variant="nav" fullWidth onClick={() => handleAction(item.action)}>
                    <span aria-hidden="true" className={s.icon}>
                      {item.icon}
                    </span>
                    <span className={s.label}>{item.label}</span>
                    {item.badge ? (
                      <span className={s.badge}>
                        {item.badge}
                        <span className="sr-only"> notifications</span>
                      </span>
                    ) : null}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </aside>
  )
}
