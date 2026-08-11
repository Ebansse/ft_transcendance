import { useEffect, useState } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { ConfirmModal } from '../components/ConfirmModal.tsx'
import { EditUserModal } from '../components/EditUserModal.tsx'
import { MenuActions } from '../components/MenuActions.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { Tableau, type Colonne } from '../components/Tableau.tsx'
import {
  deleteUser,
  getAllUsers,
  handleAction,
  updateUser,
  type UpdateUserPayload,
  type UserPublicProfileDto,
} from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import s from './AdminPage.module.css'

/** Entrées du menu « … » pas encore branchées : elles se contentent de logger. */
const PLACEHOLDER_ACTIONS = ['test3', 'test4']

/** `online` arrive en ISO (un `Instant` Java) ; null tant que jamais connecté. */
function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR')
}

/** Le back fournit un message quand il refuse ; sinon on retombe sur `fallback`. */
function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
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

  // Le compte visé par chaque modale ; `null` = modale fermée. `showModal()` rend
  // la page inerte, donc une seule peut être ouverte : `pending` et `modalError`
  // décrivent toujours la requête de celle qui est ouverte.
  const [editing, setEditing] = useState<UserPublicProfileDto | null>(null)
  const [deleting, setDeleting] = useState<UserPublicProfileDto | null>(null)
  const [pending, setPending] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return

    // Le composant peut être démonté avant la réponse : on ignore alors le résultat.
    let alive = true
    setLoading(true)
    setError(null)

    getAllUsers()
      .then((list) => {
        if (alive) setUsers(list)
      })
      .catch((err: unknown) => {
        if (alive) setError(messageOf(err, 'Chargement des comptes impossible.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [isAdmin])

  const askEdit = (row: UserPublicProfileDto) => {
    setModalError(null)
    setEditing(row)
  }

  const askDelete = (row: UserPublicProfileDto) => {
    setModalError(null)
    setDeleting(row)
  }

  /** Le back renvoie le profil à jour : on remplace la ligne au lieu de tout recharger. */
  const saveUser = async (idUser: string, values: UpdateUserPayload) => {
    setPending(true)
    setModalError(null)
    try {
      const updated = await updateUser(idUser, values)
      setUsers((list) => list.map((row) => (row.id === updated.id ? updated : row)))
      setEditing(null)
    } catch (err) {
      // La modale reste ouverte : la saisie refusée est encore là, corrigeable.
      setModalError(messageOf(err, 'Mise à jour impossible.'))
    } finally {
      setPending(false)
    }
  }

  /** Suppression confirmée : le back répond 204, on retire la ligne localement. */
  const confirmDelete = async () => {
    if (!deleting) return
    const idUser = deleting.id

    setPending(true)
    setModalError(null)
    try {
      await deleteUser(idUser)
      setUsers((list) => list.filter((row) => row.id !== idUser))
      setDeleting(null)
    } catch (err) {
      setModalError(messageOf(err, 'Suppression impossible.'))
    } finally {
      setPending(false)
    }
  }

  const columns: Colonne<UserPublicProfileDto>[] = [
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
            { key: 'edit', label: 'Edit', onSelect: () => askEdit(u) },
            { key: 'delete', label: 'Delete', onSelect: () => askDelete(u) },
            ...PLACEHOLDER_ACTIONS.map((action) => ({
              key: action,
              label: action,
              onSelect: () => handleAction(`admin:user:${action}:${u.id}`),
            })),
          ]}
        />
      ),
    },
  ]

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
            pending={pending}
            error={modalError}
            onClose={() => setEditing(null)}
            onSave={saveUser}
          />

          <ConfirmModal
            open={deleting !== null}
            title="Supprimer le compte"
            confirmLabel="Supprimer"
            pendingLabel="Suppression…"
            pending={pending}
            error={modalError}
            onConfirm={confirmDelete}
            onCancel={() => setDeleting(null)}
          >
            Le compte <strong>{deleting?.userName}</strong> ({deleting?.email}) sera supprimé,
            ainsi que son rôle, ses sessions et ses liens d'amitié. C'est irréversible.
          </ConfirmModal>
        </section>
      )}
    </AppLayout>
  )
}
