import { Chess, type Square } from 'chess.js'
import { useState } from 'react'
import { sendChessInvitation } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import { ChessInviteModal } from '../components/ChessInviteModal.tsx'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { ChessBoard, type BoardOrientation } from '../components/ChessBoard.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { outcomeOf, squaresOf } from '../lib/chessBoard.ts'
import s from './ChessPage.module.css'

type ChessPageProps = {
  onNavigate: (action: string) => void
}

/** Tout ce que la vue a besoin de savoir de la partie, figé après chaque coup.
 *  L'instance chess.js, elle, est mutable : on la garde à côté et on remplace
 *  l'instantané à chaque changement pour déclencher le rendu. */
type Snapshot = {
  squares: (string | null)[]
  turn: 'w' | 'b'
  check: boolean
  fen: string
  /** `san` pour l'affichage (« Cxf7 »), `lan` = format UCI attendu par le back. */
  history: { san: string; lan: string }[]
  outcome: string | null
}

function newGame() {
  const chess = new Chess()
  return { chess, view: snapshot(chess) }
}

function snapshot(chess: Chess): Snapshot {
  return {
    squares: squaresOf(chess),
    turn: chess.turn(),
    check: chess.isCheck(),
    fen: chess.fen(),
    history: chess.history({ verbose: true }).map(({ san, lan }) => ({ san, lan })),
    outcome: outcomeOf(chess),
  }
}

/** Regroupe les coups deux par deux pour l'affichage : « 1. e4 e5 ». */
function toRounds(history: { san: string }[]) {
  const rounds: { number: number; white: string; black: string | null }[] = []

  for (let i = 0; i < history.length; i += 2) {
    rounds.push({
      number: i / 2 + 1,
      white: history[i].san,
      black: history[i + 1]?.san ?? null,
    })
  }

  return rounds
}

/** Page Échecs : une partie complète, jouée en local dans le navigateur.
 *
 *  chess.js applique toutes les règles (déplacements légaux, roque, prise en
 *  passant, clouage, mat, pat, nulles) ; il n'y a ni adversaire, ni recherche
 *  de partie, ni sauvegarde — aucun appel réseau n'est fait ici. Le jour où
 *  l'on branchera `/api/chess/**`, la position viendra du FEN serveur et les
 *  coups partiront en UCI (`lan`) ; le reste de la page tient. */
export function ChessPage({ onNavigate }: ChessPageProps) {
  const { user } = useAuthModal()

  const [game, setGame] = useState(newGame)
  const [selected, setSelected] = useState<string | null>(null)
  const [targets, setTargets] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [orientation, setOrientation] = useState<BoardOrientation>('white')

  const [inviteOpen, setInviteOpen] = useState(false)
  /** Pseudo dont l'invitation part en ce moment : verrouille toute la liste. */
  const [invitePending, setInvitePending] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  /** Dernier adversaire invité, pour l'accusé de réception du panneau. */
  const [inviteSent, setInviteSent] = useState<string | null>(null)

  const { chess, view } = game

  /** Sélectionne la case si elle porte une pièce du camp au trait, et calcule
   *  ses arrivées légales. Renvoie `false` si la case n'est pas jouable. */
  const select = (square: string) => {
    const moves = chess.moves({ square: square as Square, verbose: true })
    if (moves.length === 0) return false

    setSelected(square)
    setTargets(moves.map((move) => move.to))
    return true
  }

  const clearSelection = () => {
    setSelected(null)
    setTargets([])
  }

  const handleSquareClick = (square: string) => {
    /* Partie terminée : le plateau est inerte, plus rien ne bouge. */
    if (view.outcome !== null) return

    if (selected === null) {
      select(square)
      return
    }

    if (square === selected) {
      clearSelection()
      return
    }

    /* Pas une arrivée légale : soit c'est une autre pièce à nous et on change
       de sélection, soit le clic ne veut rien dire et on l'ignore. */
    if (!targets.includes(square)) {
      select(square)
      return
    }

    // Promotion : dame d'office. Un sélecteur de pièce viendra plus tard.
    chess.move({ from: selected as Square, to: square as Square, promotion: 'q' })

    const next = snapshot(chess)
    setGame({ chess, view: next })
    setLastMove({ from: selected, to: square })
    clearSelection()

    /* Émis ici, et non dans un effet : le coup qui termine la partie est joué
       une seule fois, donc le message ne peut pas être dupliqué. */
    if (next.outcome !== null) console.log(`[chess] Partie terminée — ${next.outcome}`)
  }

  const resetGame = () => {
    setGame(newGame())
    setLastMove(null)
    clearSelection()
  }

  const openInvite = () => {
    setInviteError(null)
    setInviteSent(null)
    setInviteOpen(true)
  }

  /** Envoie l'invitation puis referme la modale. Un refus du back la laisse
   *  ouverte : le message se lit à côté de la liste et on peut réessayer. */
  const invite = async (userName: string) => {
    setInvitePending(userName)
    setInviteError(null)

    try {
      await sendChessInvitation(userName)
      setInviteSent(userName)
      setInviteOpen(false)
    } catch (err: unknown) {
      setInviteError(err instanceof ApiError ? err.message : 'Invitation refusée.')
    } finally {
      setInvitePending(null)
    }
  }

  const rounds = toRounds(view.history)
  const turnLabel = view.turn === 'w' ? 'Trait aux blancs' : 'Trait aux noirs'

  return (
    <AppLayout current="nav:chess" onNavigate={onNavigate}>
      <PageHeader
        title="Échecs"
        subtitle="Partie locale complète : règles, échec et mat, pat. Aucun adversaire, aucune sauvegarde."
      />

      <section className={s.layout} aria-labelledby="chess-board-title">
        <div>
          <SectionTitle id="chess-board-title">Plateau</SectionTitle>
          <ChessBoard
            squares={view.squares}
            orientation={orientation}
            selected={selected}
            targets={targets}
            lastMove={lastMove}
            onSquareClick={handleSquareClick}
          />
        </div>

        <aside className={s.panel} aria-label="Informations de la partie">
          <div className={s.players}>
            <p className={s.player}>
              <span className={s.side}>Noirs</span>
              <span className={s.name}>En attente d'adversaire</span>
            </p>
            <p className={s.player}>
              <span className={s.side}>Blancs</span>
              <span className={s.name}>{user?.userName ?? 'Vous'}</span>
            </p>
          </div>

          {view.outcome === null ? (
            <p className={s.turn} aria-live="polite">
              {turnLabel} · coup {Math.floor(view.history.length / 2) + 1}
              {view.check ? ' · échec !' : ''}
            </p>
          ) : (
            <p className={s.over} role="status">
              {view.outcome}
            </p>
          )}

          <div>
            <p className={s.blockTitle}>Coups joués</p>
            {rounds.length === 0 ? (
              <p className={s.empty}>Aucun coup pour l'instant.</p>
            ) : (
              <ol className={s.moveList}>
                {rounds.map((round) => (
                  <li key={round.number} className={s.round}>
                    <span className={s.roundNumber}>{round.number}.</span>
                    <span>{round.white}</span>
                    <span>{round.black ?? ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <p className={s.blockTitle}>FEN</p>
            <code className={s.fenValue}>{view.fen}</code>
          </div>

          <div className={s.actions}>
            <Button variant="primary" fullWidth onClick={resetGame}>
              Reset la game
            </Button>
            <Button variant="primary" fullWidth onClick={openInvite}>
              Inviter un(e) ami(e)
            </Button>

            <ChessInviteModal
              open={inviteOpen}
              pending={invitePending}
              error={inviteError}
              onClose={() => setInviteOpen(false)}
              onInvite={invite}
            />

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setOrientation((side) => (side === 'white' ? 'black' : 'white'))}
            >
              Retourner l'échiquier
            </Button>
            {inviteSent !== null && (
              <p className={s.hint} aria-live="polite">
                Invitation envoyée à {inviteSent}.
              </p>
            )}

            <p className={s.hint}>
              Invitations, adversaire et parties sauvegardées arriveront avec le branchement du
              serveur.
            </p>
          </div>
        </aside>
      </section>
    </AppLayout>
  )
}
