import { Chess, type Square } from 'chess.js'
import { useEffect, useState } from 'react'
import { getUserProfile, sendChessInvitation } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import { ChessInviteModal } from '../components/ChessInviteModal.tsx'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { ChessBoard, type BoardOrientation } from '../components/ChessBoard.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { START_FEN, squaresOf } from '../lib/chessBoard.ts'
import type { ChessMatchDto } from '../lib/chessClient.ts'
import { useChessMatch } from '../ws/useChessMatch.ts'
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
  }
}

/** Deux FEN décrivent-ils la même position ? On ne compare que les trois
 *  premiers champs — pièces, trait, roques.
 *
 *  Les compteurs de coups, et surtout la case de prise en passant, ne sont pas
 *  notés pareil par les deux moteurs : chesslib côté back l'écrit après chaque
 *  poussée de deux cases, chess.js seulement quand la prise est réellement
 *  légale. Les comparer ferait croire à un écart permanent. */
function samePosition(left: string, right: string) {
  return left.split(' ').slice(0, 3).join(' ') === right.split(' ').slice(0, 3).join(' ')
}

/** Copie une partie avec son historique. La copie évite de toucher à
 *  l'instance affichée tant qu'on ne sait pas si le coup reçu s'applique. */
function cloneGame(chess: Chess) {
  const copy = new Chess()

  try {
    copy.loadPgn(chess.pgn())
    return copy
  } catch {
    /* Partie reprise depuis un FEN, sans historique rejouable. */
    return new Chess(chess.fen())
  }
}

/** Rejoue le coup reçu du serveur sur une copie, pour garder la liste des
 *  coups. Renvoie `null` si le coup ne s'applique pas ou si la position
 *  obtenue n'est pas celle du serveur : l'appelant repart alors du FEN. */
function replay(chess: Chess, move: string, expectedFen: string) {
  const copy = cloneGame(chess)

  try {
    copy.move({
      from: move.slice(0, 2) as Square,
      to: move.slice(2, 4) as Square,
      promotion: move.length > 4 ? move[4] : undefined,
    })
  } catch {
    return null
  }

  return samePosition(copy.fen(), expectedFen) ? copy : null
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

/** Fin de partie vue par le serveur — la seule qui fasse foi, car un abandon
 *  ne se lit pas sur le plateau. */
function outcomeOfMatch(match: ChessMatchDto) {
  if (match.status === 'IN_PROGRESS') return null

  const winner = match.winnerSide === 'WHITE' ? 'les blancs' : 'les noirs'

  if (match.status === 'CHECKMATE') return `Échec et mat — ${winner} gagnent`
  if (match.status === 'RESIGNED') return `Abandon — ${winner} gagnent`
  if (match.status === 'STALEMATE') return 'Pat — partie nulle'

  return 'Partie nulle'
}

/** Page Échecs : uniquement des parties en ligne, contre un(e) ami(e) invité(e).
 *
 *  Sans partie serveur (`GET /chess/matches/me`), le plateau reste dessiné à la
 *  position de départ mais n'accepte aucun clic : il n'y a personne en face.
 *  Avec partie, la position vient du serveur, les coups y partent en UCI et ceux
 *  de l'adversaire arrivent par la socket. chess.js applique les règles côté
 *  client pour l'affichage ; le serveur reste juge, et sa position l'emporte. */
export function ChessPage({ onNavigate }: ChessPageProps) {
  const { user } = useAuthModal()
  const online = useChessMatch()
  const { match, mySide, isMyTurn, serverMove } = online

  const [game, setGame] = useState(newGame)
  const [selected, setSelected] = useState<string | null>(null)
  const [targets, setTargets] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [orientation, setOrientation] = useState<BoardOrientation>('white')
  const [opponentName, setOpponentName] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  /** Pseudo dont l'invitation part en ce moment : verrouille toute la liste. */
  const [invitePending, setInvitePending] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  /** Dernier adversaire invité, pour l'accusé de réception du panneau. */
  const [inviteSent, setInviteSent] = useState<string | null>(null)

  const { chess, view } = game

  /* On joue de son côté du plateau, sans avoir à retourner l'échiquier. */
  useEffect(() => {
    if (mySide !== null) setOrientation(mySide === 'BLACK' ? 'black' : 'white')
  }, [mySide])

  /* La position du serveur fait foi. On tente d'abord de rejouer le coup reçu
     pour garder l'historique ; s'il ne retombe pas dessus (partie reprise en
     cours de route, coup refusé qu'on avait joué en avance), on repart du FEN.
     Ce même effet sert donc de retour en arrière, et rend le plateau à sa
     position de départ quand on quitte une partie terminée. */
  useEffect(() => {
    if (match === null) {
      setGame((current) => (samePosition(current.view.fen, START_FEN) ? current : newGame()))
      setLastMove(null)
      return
    }

    /* Updater volontairement *pur* : il ne mute rien (`replay` travaille sur
       une copie) et ne pose aucun état. L'effet ne dépend donc que de ce qui
       vient du serveur — au pire d'un futur désaccord de FEN, la page
       reconstruit une fois par message reçu, elle ne peut pas boucler. */
    setGame((current) => {
      if (samePosition(current.view.fen, match.fen)) return current

      const played = serverMove === null ? null : replay(current.chess, serverMove.move, match.fen)
      if (played !== null) return { chess: played, view: snapshot(played) }

      const fresh = new Chess(match.fen)
      return { chess: fresh, view: snapshot(fresh) }
    })

    if (serverMove !== null) {
      setLastMove({ from: serverMove.move.slice(0, 2), to: serverMove.move.slice(2, 4) })
    }
  }, [match, serverMove])

  /* Le back ne donne que l'UUID des joueurs : le pseudo se demande à part. */
  useEffect(() => {
    if (match === null || mySide === null) {
      setOpponentName(null)
      return
    }

    const opponentId = mySide === 'WHITE' ? match.blackPlayerId : match.whitePlayerId
    if (opponentId === null) return

    let alive = true
    getUserProfile(opponentId)
      .then((profile) => {
        if (alive) setOpponentName(profile.userName)
      })
      .catch(() => {
        if (alive) setOpponentName(null)
      })

    return () => {
      alive = false
    }
  }, [match, mySide])

  const running = match !== null && match.status === 'IN_PROGRESS'
  const outcome = match === null ? null : outcomeOfMatch(match)
  /* Sans adversaire, ou hors de son tour, le plateau ne répond pas. */
  const playable = running && isMyTurn

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
    /* Aucune partie, partie terminée, ou tour de l'adversaire : plateau inerte. */
    if (!playable || match === null) return

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
    const played = chess.move({ from: selected as Square, to: square as Square, promotion: 'q' })

    setGame({ chess, view: snapshot(chess) })
    setLastMove({ from: selected, to: square })
    clearSelection()

    /* Le coup part au serveur dès qu'il est joué. On l'affiche sans attendre la
       réponse : chess.js a déjà vérifié qu'il est légal, et un refus du back
       nous ramènerait de toute façon sur sa position. */
    void online.play(match.matchId, played.lan)
  }

  /** Referme une partie terminée. Sans ce `leave`, la resynchronisation
   *  ramènerait aussitôt sa position finale, et le back interdirait toute
   *  nouvelle invitation aux deux joueurs. */
  const leaveMatch = () => {
    online.leave()
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
  const myName = user?.userName ?? 'Vous'
  const theirName = opponentName ?? '…'
  const whiteName = match === null ? '—' : mySide === 'WHITE' ? myName : theirName
  const blackName = match === null ? '—' : mySide === 'BLACK' ? myName : theirName

  return (
    <AppLayout current="nav:chess" onNavigate={onNavigate}>
      <PageHeader
        title="Échecs"
        subtitle={
          match === null
            ? 'Invitez un(e) ami(e) pour lancer une partie.'
            : 'Partie en ligne : les coups de l’adversaire arrivent en temps réel.'
        }
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
              <span className={s.name}>{blackName}</span>
            </p>
            <p className={s.player}>
              <span className={s.side}>Blancs</span>
              <span className={s.name}>{whiteName}</span>
            </p>
          </div>

          {running && (
            <p className={s.turn} aria-live="polite">
              {isMyTurn ? 'À vous de jouer' : 'Trait à l’adversaire'} · coup{' '}
              {Math.floor(view.history.length / 2) + 1}
              {view.check ? ' · échec !' : ''}
            </p>
          )}

          {outcome !== null && (
            <p className={s.over} role="status">
              {outcome}
            </p>
          )}

          {online.error !== null && (
            <p className={s.over} role="status">
              {online.error}
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
            {running && (
              /* Seule sortie d'une partie en cours. */
              <Button variant="primary" fullWidth onClick={() => void online.resign(match.matchId)}>
                Abandonner
              </Button>
            )}

            {match !== null && !running && (
              <Button variant="primary" fullWidth onClick={leaveMatch}>
                Quitter la partie
              </Button>
            )}

            <Button variant="primary" fullWidth disabled={running} onClick={openInvite}>
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

            {match === null && (
              <p className={s.hint}>
                Aucune partie en cours — le plateau s'active dès qu'un(e) ami(e) accepte votre
                invitation.
              </p>
            )}
          </div>
        </aside>
      </section>
    </AppLayout>
  )
}
