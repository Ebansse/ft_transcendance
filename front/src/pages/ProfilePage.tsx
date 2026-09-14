import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { TwoFactorModal } from '../components/TwoFactorModal.tsx'
import {
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
  updateMyProfile,
  uploadMyAvatar,
} from '../lib/actions.ts'
import type { TwoFactorSetupDto } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import s from './ProfilePage.module.css'

/* Règles alignées sur le back : `UserService.isInvalidUsername` /
   `isInvalidEmail` et `AvatarStorageService` (2 Mo, PNG/JPEG). La validation
   front ne remplace pas celle du back, elle évite juste un aller-retour. */
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/
const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/
const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/png', 'image/jpeg']
const DEFAULT_AVATAR = '/api/default-avatar.png'

/** `avatarUrl` renvoyé par le back est relatif au préfixe `/api`
 *  (ex: `/avatars/uuid.png`). NB : le service des images n'est pas encore câblé
 *  entre front et back — l'`<img>` peut rester cassé tant que ce n'est pas fait. */
function avatarSrc(url: string | null) {
  return url ? `/api${url}` : DEFAULT_AVATAR
}

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

/** Comme `messageOf`, mais remonte le message du champ `code` quand le back
 *  refuse le format (`@Valid`) plutôt que le générique « Données invalides ». */
function codeErrorOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? (err.fieldErrors.code ?? err.message) : fallback
}

type ProfilePageProps = {
  onNavigate: (action: string) => void
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, isLoggedIn, authChecked, refreshUser } = useAuthModal()

  // Bloc identité : pseudo + e-mail.
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [savingId, setSavingId] = useState(false)
  const [idErrors, setIdErrors] = useState<Record<string, string>>({})
  const [idError, setIdError] = useState<string | null>(null)
  const [idNotice, setIdNotice] = useState<string | null>(null)

  // Bloc avatar : fichier choisi (pas encore envoyé) et son aperçu local.
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null)

  // Bloc A2F : modale ouverte (et dans quel sens), QR code reçu du setup.
  const [twoFactorMode, setTwoFactorMode] = useState<'enable' | 'disable' | null>(null)
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupDto | null>(null)
  const [twoFactorPending, setTwoFactorPending] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null)

  // On repart des valeurs de la session à chaque changement de compte, sinon la
  // page garderait la saisie du compte précédent après une déconnexion.
  useEffect(() => {
    if (user) {
      setUserName(user.userName)
      setEmail(user.email)
    }
  }, [user])

  // L'aperçu est une URL blob : on la révoque quand le fichier change ou au démontage.
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
      // Le back renvoie soit une map champ → message (@Valid), soit un texte brut
      // (e-mail ou pseudo déjà pris) : on route l'un vers les champs, l'autre en bloc.
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setIdErrors(err.fieldErrors)
      } else {
        setIdError(messageOf(err, 'Enregistrement impossible.'))
      }
    } finally {
      setSavingId(false)
    }
  }

  /** Demande un secret au back, puis ouvre la modale avec le QR code. */
  const startEnable = async () => {
    setTwoFactorPending(true)
    setTwoFactorError(null)
    setTwoFactorNotice(null)
    try {
      setTwoFactorSetup(await setupTwoFactor())
      setTwoFactorMode('enable')
    } catch (err) {
      setTwoFactorError(messageOf(err, 'Impossible de générer le QR code.'))
    } finally {
      setTwoFactorPending(false)
    }
  }

  const startDisable = () => {
    setTwoFactorError(null)
    setTwoFactorNotice(null)
    setTwoFactorMode('disable')
  }

  const closeTwoFactor = () => {
    setTwoFactorMode(null)
    setTwoFactorSetup(null)
    setTwoFactorError(null)
  }

  /** Envoie le code au back ; le profil relu met à jour l'état des boutons. */
  const submitTwoFactor = async (code: string) => {
    const enabling = twoFactorMode === 'enable'

    setTwoFactorPending(true)
    setTwoFactorError(null)
    try {
      await (enabling ? enableTwoFactor(code) : disableTwoFactor(code))
      await refreshUser()
      closeTwoFactor()
      setTwoFactorNotice(enabling ? 'A2F activée.' : 'A2F désactivée.')
    } catch (err) {
      setTwoFactorError(codeErrorOf(err, 'Vérification impossible.'))
    } finally {
      setTwoFactorPending(false)
    }
  }

  return (
    <AppLayout current="nav:profile" onNavigate={onNavigate}>
      <PageHeader title="Profil" subtitle="Ta photo, ton pseudo et ton adresse e-mail." />

      {/* Tant que la session n'est pas vérifiée, on n'affiche ni formulaire ni refus. */}
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

          <section className={s.section} aria-labelledby="profile-2fa-title">
            <SectionTitle id="profile-2fa-title">Sécurité</SectionTitle>
            <p className={s.hint}>
              Authentification à deux facteurs : {user.twoFactorEnabled ? 'activée' : 'désactivée'}.
            </p>
            <div className={s.twoFactorActions}>
              <Button
                variant="primary"
                onClick={startEnable}
                disabled={twoFactorPending || user.twoFactorEnabled === true}
              >
                Activer l’A2F
              </Button>
              <Button onClick={startDisable} disabled={twoFactorPending || !user.twoFactorEnabled}>
                Désactiver l’A2F
              </Button>
            </div>
            {/* Modale fermée : les erreurs (échec du setup) s'affichent sous les boutons. */}
            {twoFactorError && !twoFactorMode && <p className={s.error}>{twoFactorError}</p>}
            {twoFactorNotice && <p className={s.notice}>{twoFactorNotice}</p>}
          </section>

          {/* La `key` remonte la modale à chaque ouverture : le champ code repart vide. */}
          <TwoFactorModal
            key={twoFactorMode ?? 'closed'}
            mode={twoFactorMode}
            setup={twoFactorSetup}
            pending={twoFactorPending}
            error={twoFactorError}
            onSubmit={submitTwoFactor}
            onClose={closeTwoFactor}
          />
        </>
      )}
    </AppLayout>
  )
}
