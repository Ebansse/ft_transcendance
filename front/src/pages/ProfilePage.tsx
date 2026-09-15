import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { updateMyProfile, uploadMyAvatar } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import s from './ProfilePage.module.css'

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/
const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/
const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/png', 'image/jpeg']
const DEFAULT_AVATAR = '/api/default-avatar.png'

function avatarSrc(url: string | null) {
  return url ? `/api${url}` : DEFAULT_AVATAR
}

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

type ProfilePageProps = {
  onNavigate: (action: string) => void
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, isLoggedIn, authChecked, refreshUser } = useAuthModal()

  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [savingId, setSavingId] = useState(false)
  const [idErrors, setIdErrors] = useState<Record<string, string>>({})
  const [idError, setIdError] = useState<string | null>(null)
  const [idNotice, setIdNotice] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setUserName(user.userName)
      setEmail(user.email)
    }
  }, [user])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const dirty = useMemo(
    () => user !== null && (userName !== user.userName || email !== user.email),
    [user, userName, email],
  )

  const pickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null)
    setAvatarNotice(null)

    const picked = event.target.files?.[0] ?? null
    if (!picked) {
      setFile(null)
      return
    }
    if (!AVATAR_TYPES.includes(picked.type)) {
      setAvatarError('Formats acceptés : PNG ou JPEG.')
      setFile(null)
      return
    }
    if (picked.size > AVATAR_MAX_BYTES) {
      setAvatarError('Image trop lourde : 2 Mo maximum.')
      setFile(null)
      return
    }
    setFile(picked)
  }

  const submitAvatar = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return

    setUploading(true)
    setAvatarError(null)
    setAvatarNotice(null)
    try {
      await uploadMyAvatar(file)
      await refreshUser()
      setFile(null)
      setAvatarNotice('Photo de profil mise à jour.')
    } catch (err) {
      setAvatarError(messageOf(err, 'Envoi de l’image impossible.'))
    } finally {
      setUploading(false)
    }
  }

  const submitIdentity = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return

    const name = userName.trim()
    const mail = email.trim()

    const next: Record<string, string> = {}
    if (!USERNAME_RE.test(name)) next.userName = '3 à 20 caractères : lettres, chiffres ou _.'
    if (!EMAIL_RE.test(mail)) next.email = 'Adresse e-mail invalide.'
    setIdErrors(next)
    setIdError(null)
    setIdNotice(null)
    if (Object.keys(next).length > 0) return

    setSavingId(true)
    try {
      await updateMyProfile(user.id, { userName: name, email: mail })
      await refreshUser()
      setIdNotice('Profil enregistré.')
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setIdErrors(err.fieldErrors)
      } else {
        setIdError(messageOf(err, 'Enregistrement impossible.'))
      }
    } finally {
      setSavingId(false)
    }
  }

  return (
    <AppLayout current="nav:profile" onNavigate={onNavigate}>
      <PageHeader title="Profil" subtitle="Ta photo, ton pseudo et ton adresse e-mail." />

      {/* Tant que session pas vérifiée on affiche rien */}
      {!authChecked ? null : !isLoggedIn || !user ? (
        <p className={s.denied}>Connecte-toi pour accéder à ton profil.</p>
      ) : (
        <>
          <section className={s.section} aria-labelledby="profile-avatar-title">
            <SectionTitle id="profile-avatar-title">Photo de profil</SectionTitle>
            <form className={s.avatarForm} onSubmit={submitAvatar}>
              <img
                className={s.avatar}
                src={preview ?? avatarSrc(user.avatarUrl)}
                alt="Ton avatar"
                width={96}
                height={96}
              />
              <div className={s.avatarControls}>
                <label className={s.fileLabel}>
                  <input
                    className={s.fileInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={pickAvatar}
                  />
                  {file ? file.name : 'Choisir une image'}
                </label>
                <p className={s.hint}>PNG ou JPEG, 2 Mo maximum.</p>
                <Button type="submit" variant="primary" disabled={!file || uploading}>
                  {uploading ? 'Envoi…' : 'Téléverser'}
                </Button>
                {avatarError && <p className={s.error}>{avatarError}</p>}
                {avatarNotice && <p className={s.notice}>{avatarNotice}</p>}
              </div>
            </form>
          </section>

          <section className={s.section} aria-labelledby="profile-identity-title">
            <SectionTitle id="profile-identity-title">Identité</SectionTitle>
            <form className={s.form} onSubmit={submitIdentity} noValidate>
              <div className={s.field}>
                <label className={s.label} htmlFor="profile-username">
                  Pseudo
                </label>
                <input
                  id="profile-username"
                  className={idErrors.userName ? `${s.input} ${s.inputError}` : s.input}
                  type="text"
                  value={userName}
                  autoComplete="username"
                  onChange={(event) => setUserName(event.target.value)}
                />
                {idErrors.userName && <p className={s.error}>{idErrors.userName}</p>}
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="profile-email">
                  E-mail
                </label>
                <input
                  id="profile-email"
                  className={idErrors.email ? `${s.input} ${s.inputError}` : s.input}
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                />
                {idErrors.email && <p className={s.error}>{idErrors.email}</p>}
              </div>

              {idError && <p className={s.error}>{idError}</p>}
              {idNotice && <p className={s.notice}>{idNotice}</p>}

              <div className={s.actions}>
                <Button type="submit" variant="primary" disabled={savingId || !dirty}>
                  {savingId ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </section>
        </>
      )}
    </AppLayout>
  )
}
