import { useState } from 'react'
import { Button } from './Button.tsx'
import type { UndercoverGameMode, UndercoverRoom, UndercoverRules } from '../lib/undercoverClient.ts'
import { MODE_DESCRIPTIONS, MODE_LABELS } from '../lib/undercoverLabels.ts'
import s from './UndercoverRoomPanel.module.css'

type UndercoverRoomPanelProps = {
  room: UndercoverRoom
  myId: string
  pending: boolean
  onConfigure: (mode: UndercoverGameMode, rules: UndercoverRules | null) => Promise<boolean>
  onStart: () => void
  onLeave: () => void
}

/** La salle d'attente : le code à partager, les membres, et les réglages —
 *  modifiables par l'hôte seul, lus par les autres. */
export function UndercoverRoomPanel({
  room,
  myId,
  pending,
  onConfigure,
  onStart,
  onLeave,
}: UndercoverRoomPanelProps) {
  const isHost = room.hostId === myId
  const [copied, setCopied] = useState(false)
  const enough = room.members.length >= room.minPlayers

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* Presse-papiers refusé (contexte non sécurisé) : le code reste lisible. */
    }
  }

  return (
    <div className={s.layout}>
      <section className={s.card} aria-labelledby="uc-room-code">
        <p className={s.blockTitle} id="uc-room-code">
          Code de la salle
        </p>
        <div className={s.codeRow}>
          <span className={s.code}>{room.code}</span>
          <Button variant="secondary" onClick={() => void copyCode()}>
            {copied ? 'Copié ✓' : 'Copier'}
          </Button>
        </div>
        <p className={s.hint}>Partagez ce code : vos amis le saisissent pour rejoindre la salle.</p>

        <p className={s.blockTitle}>
          Joueurs · {room.members.length}/{room.maxPlayers}
        </p>
        <ul className={s.members}>
          {room.members.map((member) => (
            <li key={member.userId} className={s.member}>
              <span className={s.memberName}>{member.userName ?? 'Compte supprimé'}</span>
              <span className={s.tags}>
                {member.userId === room.hostId && <span className={s.tag}>Hôte</span>}
                {member.userId === myId && <span className={s.tagMuted}>Vous</span>}
              </span>
            </li>
          ))}
        </ul>

        <div className={s.actions}>
          {isHost ? (
            <Button variant="primary" fullWidth disabled={pending || !enough} onClick={onStart}>
              {enough
                ? 'Lancer la partie'
                : `En attente de joueurs (${room.members.length}/${room.minPlayers})`}
            </Button>
          ) : (
            <p className={s.hint}>L’hôte lancera la partie dès que la table est prête.</p>
          )}
          <Button variant="ghost" fullWidth disabled={pending} onClick={onLeave}>
            Quitter la salle
          </Button>
        </div>
      </section>

      <section className={s.card} aria-labelledby="uc-room-settings">
        <p className={s.blockTitle} id="uc-room-settings">
          Mode de jeu
        </p>
        {isHost ? (
          /* Remonté à chaque vrai changement de règles venu du serveur, ce qui
             repart d'un brouillon neuf. La clé ne dépend que des règles : la salle
             est renvoyée entière à chaque arrivée d'un joueur, et remonter sur
             l'objet effacerait ce que l'hôte est en train de saisir. */
          <HostSettings
            key={JSON.stringify(room.rules)}
            room={room}
            pending={pending}
            onConfigure={onConfigure}
          />
        ) : (
          <>
            <p className={s.modeName}>{MODE_LABELS[room.mode]}</p>
            <p className={s.hint}>{MODE_DESCRIPTIONS[room.mode]}</p>
            <RulesSummary rules={room.rules} />
          </>
        )}
      </section>
    </div>
  )
}

type HostSettingsProps = {
  room: UndercoverRoom
  pending: boolean
  onConfigure: (mode: UndercoverGameMode, rules: UndercoverRules | null) => Promise<boolean>
}

function HostSettings({ room, pending, onConfigure }: HostSettingsProps) {
  /* Brouillon local des règles personnalisées : rien ne part au serveur avant
     « Enregistrer », pour ne pas pousser un réglage à chaque frappe. */
  const [draft, setDraft] = useState<UndercoverRules>(room.rules)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof UndercoverRules>(key: K, value: UndercoverRules[K]) => {
    setSaved(false)
    setDraft((previous) => ({ ...previous, [key]: value }))
  }

  const save = async () => {
    if (await onConfigure('CUSTOM', draft)) setSaved(true)
  }

  return (
    <>
      <div className={s.modes} role="group" aria-label="Mode de jeu">
        {(Object.keys(MODE_LABELS) as UndercoverGameMode[]).map((mode) => (
          <Button
            key={mode}
            variant={room.mode === mode ? 'primary' : 'secondary'}
            fullWidth
            disabled={pending}
            onClick={() => void onConfigure(mode, mode === 'CUSTOM' ? draft : null)}
          >
            {MODE_LABELS[mode]}
          </Button>
        ))}
      </div>
      <p className={s.hint}>{MODE_DESCRIPTIONS[room.mode]}</p>

      {room.mode !== 'CUSTOM' ? (
        <RulesSummary rules={room.rules} />
      ) : (
        <form
          className={s.form}
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <NumberField
            label="Undercovers"
            value={draft.undercoverCount}
            min={1}
            onChange={(value) => set('undercoverCount', value)}
          />
          <NumberField
            label="Mr White"
            value={draft.mrWhiteCount}
            min={0}
            onChange={(value) => set('mrWhiteCount', value)}
          />
          <NumberField
            label="Tours d’indices avant chaque vote"
            value={draft.descriptionRounds}
            min={1}
            onChange={(value) => set('descriptionRounds', value)}
          />
          <label className={s.field}>
            <span className={s.label}>Nombre de votes</span>
            <span className={s.inline}>
              <input
                type="checkbox"
                checked={draft.maxVotes === null}
                onChange={(event) => set('maxVotes', event.target.checked ? null : 1)}
              />
              <span>Illimité</span>
              {draft.maxVotes !== null && (
                <input
                  className={s.input}
                  type="number"
                  min={1}
                  value={draft.maxVotes}
                  onChange={(event) => set('maxVotes', Number(event.target.value))}
                />
              )}
            </span>
          </label>
          <NumberField
            label="Secondes par indice"
            value={draft.descriptionSeconds}
            min={15}
            onChange={(value) => set('descriptionSeconds', value)}
          />
          <NumberField
            label="Secondes pour voter"
            value={draft.voteSeconds}
            min={15}
            onChange={(value) => set('voteSeconds', value)}
          />
          <NumberField
            label="Secondes pour la devinette de Mr White"
            value={draft.mrWhiteVoteSeconds}
            min={15}
            onChange={(value) => set('mrWhiteVoteSeconds', value)}
          />
          <NumberField
            label="Revotes en cas d’égalité"
            value={draft.tieRevotes}
            min={0}
            onChange={(value) => set('tieRevotes', value)}
          />
          <CheckField
            label="Tirage au sort si l’égalité persiste"
            checked={draft.randomOnUnresolvedTie}
            onChange={(value) => set('randomOnUnresolvedTie', value)}
          />
          <CheckField
            label="Les imposteurs gagnent à égalité avec les agents"
            checked={draft.undercoverWinOnParity}
            onChange={(value) => set('undercoverWinOnParity', value)}
          />
          <Button type="submit" variant="primary" fullWidth disabled={pending}>
            {saved ? 'Réglages enregistrés ✓' : 'Enregistrer les réglages'}
          </Button>
          <p className={s.hint}>Les règles sont vérifiées au lancement, selon le nombre de joueurs.</p>
        </form>
      )}
    </>
  )
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: number
  min: number
  onChange: (value: number) => void
}) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <input
        className={s.input}
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className={s.inline}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/** Les règles en lecture seule, pour les modes préréglés et les non-hôtes. */
export function RulesSummary({ rules }: { rules: UndercoverRules }) {
  const rows: [string, string][] = [
    ['Undercovers', String(rules.undercoverCount)],
    ['Mr White', rules.mrWhiteCount === 0 ? 'Aucun' : String(rules.mrWhiteCount)],
    ['Tours d’indices avant un vote', String(rules.descriptionRounds)],
    ['Votes', rules.maxVotes === null ? 'Illimités' : String(rules.maxVotes)],
    ['Chrono indice / vote', `${rules.descriptionSeconds} s / ${rules.voteSeconds} s`],
    [
      'Égalité',
      `${rules.tieRevotes} revote${rules.tieRevotes > 1 ? 's' : ''}, puis ${
        rules.randomOnUnresolvedTie ? 'tirage au sort' : 'personne n’est éliminé'
      }`,
    ],
    ['Victoire des imposteurs à égalité', rules.undercoverWinOnParity ? 'Oui' : 'Non'],
  ]

  return (
    <dl className={s.rules}>
      {rows.map(([term, value]) => (
        <div key={term} className={s.ruleRow}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
