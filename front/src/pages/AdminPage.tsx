import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { InfoCard } from '../components/InfoCard.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import s from './AdminPage.module.css'

const SECTIONS = [
  {
    key: 'users',
    title: 'Utilisateurs',
    text: 'Rechercher un compte, consulter son profil, suspendre ou réactiver.',
  },
  {
    key: 'roles',
    title: 'Rôles & permissions',
    text: 'Attribuer les rôles USER / ADMIN et les permissions associées.',
  },
  {
    key: 'moderation',
    title: 'Modération',
    text: 'Signalements du chat, sanctions et journal des actions.',
  },
]

type AdminPageProps = {
  onNavigate: (action: string) => void
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user } = useAuthModal()
  // Garde cosmétique : le back reste seul juge sur les routes d'administration.
  const isAdmin = user?.role === 'ADMIN'

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
        <section aria-labelledby="admin-sections-title">
          <SectionTitle id="admin-sections-title">Sections</SectionTitle>
          <div className={s.sectionGrid}>
            {SECTIONS.map((section) => (
              <InfoCard key={section.key} title={section.title} text={section.text} />
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  )
}
