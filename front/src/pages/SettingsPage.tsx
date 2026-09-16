import { useState } from 'react'
import { AppLayout } from '../components/AppLayout.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import s from './SettingsPage.module.css'

type SettingsPageProps = {
  onNavigate: (action: string) => void
}

/** Préférences purement front : rien n'est envoyé au back. */
export function SettingsPage({ onNavigate }: SettingsPageProps) {
  // TODO : appliquer le thème (tokens clairs dans token.css) et le persister.
  // Pour l'instant le bouton ne fait que basculer son propre état.
  const [lightMode, setLightMode] = useState(false)

  return (
    <AppLayout current="nav:settings" onNavigate={onNavigate}>
      <PageHeader title="Paramètres" subtitle="Tes préférences d’affichage sur le site." />

      <section aria-labelledby="settings-appearance-title">
        <SectionTitle id="settings-appearance-title">Apparence</SectionTitle>

        <div className={s.row}>
          <div className={s.rowText}>
            <span id="settings-theme-label" className={s.rowLabel}>
              Thème
            </span>
            <span className={s.rowHint}>{lightMode ? 'Mode clair' : 'Mode sombre'}</span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={lightMode}
            aria-labelledby="settings-theme-label"
            className={s.switch}
            onClick={() => setLightMode((previous) => !previous)}
          >
            <span className={s.thumb} aria-hidden="true" />
          </button>
        </div>
      </section>
    </AppLayout>
  )
}
