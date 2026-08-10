import { useEffect, useMemo, useState } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { MenuActions } from '../components/MenuActions.tsx'
import { EditUserModal, type EditUserForm } from '../components/EditUserModal.tsx'
import { Tableau, type Colonne } from '../components/Tableau.tsx'
import { GetAllUserPublicProfiles, handleAction, type UserPublicProfileDto } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import s from './AdminPage.module.css'

const USER_ACTIONS = ['test2', 'test3', 'test4']

/** Les colonnes dépendent du callback d'édition : une fabrique, pas une constante. */
function buildColumns(onEdit: (row: UserPublicProfileDto) => void): Colonne<UserPublicProfileDto>[] {
  return [
    { key: 'userName', header: 'Utilisateur', render: (u) => u.userName },
    { key: 'email', header: 'E-mail', render: (u) => u.email },
    { key: 'role', header: 'Rôle', render: (u) => u.role ?? '—' },
    { key: 'online', header: 'Vu à', render: (u) => formatDate(u.online) },
    { key: 'id', header: 'Identifiant', render: (u) => u.id },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <MenuActions
          ariaLabel={`Actions sur ${u.userName}`}
          items={[
            { key: 'edit', label: 'Edit', onSelect: () => onEdit(u) },
            ...USER_ACTIONS.map((action) => ({
              key: action,
              label: action,
              onSelect: () => handleAction(`admin:user:${action}:${u.id}`),
            })),
          ]}
        />
      ),
    },
  ]
}

/** Les dates viennent du back en ISO (Instant Java) ; null tant que jamais connecté. */
function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR')
}

type AdminPageProps = {
  onNavigate: (action: string) => void
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user } = useAuthModal()
  // Garde cosmétique : le back reste seul juge sur les routes d'administration.
  const isAdmin = user?.role === 'ADMIN'

  const [users, setUsers] = useState<UserPublicProfileDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Le compte en cours d'édition ; `null` = modale fermée.
  const [editing, setEditing] = useState<UserPublicProfileDto | null>(null)

  const columns = useMemo(() => buildColumns(setEditing), [])

  useEffect(() => {
    if (!isAdmin) return

    // Le composant peut être démonté avant la réponse : on ignore alors le résultat.
    let alive = true
    setLoading(true)
    setError(null)

    GetAllUserPublicProfiles()
      .then((list) => {
        if (alive) setUsers(list)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Chargement des comptes impossible.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [isAdmin])

  /** Partie UI seulement : l'appel au back (POST + rechargement) viendra ensuite. */
  const saveUser = (idUser: string, values: EditUserForm) => {
    handleAction(`admin:user:save:${idUser}:${JSON.stringify(values)}`)
    setEditing(null)
  }

  return (
    <AppLayout current="nav:admin" onNavigate={onNavigate}>
      <PageHeader
        title="Administration"
        subtitle="Gestion des comptes, des rôles et de la modération de la plateforme."
      />

      {!isAdmin ? (
        <p className={s.denied}>
          Cette page est réservée aux administrateurs. Si tu penses que c'est une erreur,
          reconnecte-toi.
        </p>
      ) : (
        <section aria-labelledby="admin-users-title">
          <SectionTitle id="admin-users-title">Utilisateurs</SectionTitle>

          {loading && <p className={s.state}>Chargement des comptes…</p>}
          {error && <p className={s.state}>{error}</p>}

          {!loading && !error && (
            <Tableau
              caption="Liste de tous les comptes enregistrés"
              columns={columns}
              rows={users}
              rowKey={(u) => u.id}
              emptyText="Aucun compte enregistré."
            />
          )}

          <EditUserModal
            user={editing}
            onClose={() => setEditing(null)}
            onSave={saveUser}
          />
        </section>
      )}
    </AppLayout>
  )
}
