import { useEffect, useRef, useState } from 'react'
import { Button } from './Button.tsx'
import type { UserPublicProfileDto } from '../lib/actions.ts'
import s from './EditUserModal.module.css'

/** Ce que l'admin peut réellement changer. L'UUID est affiché mais jamais éditable. */
export type EditUserForm = {
  email: string
  userName: string
  role: string
}

const ROLES = ['USER', 'ADMIN']

type EditUserModalProps = {
  /** Le compte à éditer, ou `null` quand la modale est fermée. */
  user: UserPublicProfileDto | null
  onClose: () => void
  onSave: (idUser: string, values: EditUserForm) => void
}

/**
 * Modale d'édition d'un compte. Même parti pris que `AuthModal` : le <dialog>
 * natif fournit le piège de focus, la fermeture par Échap et l'inertie de la page.
 */
export function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<EditUserForm>({ email: '', userName: '', role: 'USER' })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (!user) {
      if (dialog.open) dialog.close()
      return
    }

    // Pré-remplissage : on repart des valeurs du compte à chaque ouverture, sinon
    // la modale rouvrirait sur les saisies abandonnées du compte précédent.
    setForm({ email: user.email, userName: user.userName, role: user.role ?? 'USER' })
    if (!dialog.open) dialog.showModal()
    dialog.querySelector('input')?.focus()
  }, [user])

  const update = (field: keyof EditUserForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (user) onSave(user.id, form)
  }

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="edit-user-title"
      onClose={onClose}
      onClick={(event) => {
        // La cible n'est le <dialog> lui-même que sur un clic dans le fond.
        if (event.target === ref.current) onClose()
      }}
    >
      <div className={s.head}>
        <h2 id="edit-user-title" className={s.title}>
          Modifier le compte
        </h2>
        <Button variant="ghost" ariaLabel="Fermer" onClick={onClose}>
          ✕
        </Button>
      </div>

      <form className={s.form} onSubmit={submit} noValidate>
        <div className={s.field}>
          <span className={s.label}>Identifiant</span>
          {/* Non éditable : c'est la clé utilisée par le back pour retrouver le compte. */}
          <p className={s.readonly}>{user?.id ?? '—'}</p>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="edit-user-name">
            Pseudo
          </label>
          <input
            id="edit-user-name"
            className={s.input}
            type="text"
            value={form.userName}
            autoComplete="off"
            onChange={(event) => update('userName', event.target.value)}
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="edit-user-email">
            E-mail
          </label>
          <input
            id="edit-user-email"
            className={s.input}
            type="email"
            value={form.email}
            autoComplete="off"
            onChange={(event) => update('email', event.target.value)}
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="edit-user-role">
            Rôle
          </label>
          <select
            id="edit-user-role"
            className={s.select}
            value={form.role}
            onChange={(event) => update('role', event.target.value)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role === 'ADMIN' ? 'Admin' : 'User'}
              </option>
            ))}
          </select>
        </div>

        <div className={s.actions}>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Sauvegarder
          </Button>
        </div>
      </form>
    </dialog>
  )
}
