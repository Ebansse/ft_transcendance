import { Chess, type Square } from 'chess.js'
import { useEffect, useState } from 'react'
import { getUserProfile, sendChessInvitation } from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import { ChessBotModal } from '../components/ChessBotModal.tsx'
import { ChessInviteModal } from '../components/ChessInviteModal.tsx'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { CapturedPieces } from '../components/CapturedPieces.tsx'
import { ChessBoard, type BoardOrientation } from '../components/ChessBoard.tsx'
import {
  ChessPromotionModal,
  type PromotionPiece,
} from '../components/ChessPromotionModal.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { START_FEN, capturesOf, squaresOf } from '../lib/chessBoard.ts'
import type { ChessMatchDto, ChessSide } from '../lib/chessClient.ts'
import { useChessMatch } from '../ws/useChessMatch.ts'
import s from './ChessPage.module.css'

type ChessPageProps = {
  onNavigate: (action: string) => void
}

type Snapshot = {
  squares: (string | null)[]
  turn: 'w' | 'b'
  check: boolean
  fen: string
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

function samePosition(left: string, right: string) {
  return left.split(' ').slice(0, 3).join(' ') === right.split(' ').slice(0, 3).join(' ')
}

function cloneGame(chess: Chess) {
  const copy = new Chess()

  try {
    copy.loadPgn(chess.pgn())
    return copy
  } catch {
    return new Chess(chess.fen())
  }
}

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

function catchUp(chess: Chess, expectedFen: string) {
  const copy = cloneGame(chess)

  for (const move of copy.moves()) {
    copy.move(move)
    if (samePosition(copy.fen(), expectedFen)) return copy
    copy.undo()
  }

  return null
}

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
  /** Coup de promotion en attente de sa pièce : la modale est ouverte tant
   *  qu'il est posé, et le coup ne part qu'une fois la pièce choisie. */
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null)
  const [orientation, setOrientation] = useState<BoardOrientation>('white')
  const [opponentName, setOpponentName] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  /** Pseudo dont l'invitation part en ce moment : verrouille toute la liste. */
  const [invitePending, setInvitePending] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  /** Dernier adversaire invité, pour l'accusé de réception du panneau. */
  const [inviteSent, setInviteSent] = useState<{ userName: string; side: ChessSide } | null>(
    null,
  )

  const [botOpen, setBotOpen] = useState(false)
  const [botPending, setBotPending] = useState(false)
  const [botError, setBotError] = useState<string | null>(null)

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

      /* Personne n'a nommé le coup, mais un seul coup légal peut mener à cette
         position : c'est celui du bot. */
      const found = catchUp(current.chess, match.fen)
      if (found !== null) return { chess: found, view: snapshot(found) }

      const fresh = new Chess(match.fen)
      return { chess: fresh, view: snapshot(fresh) }
    })

    if (serverMove !== null) {
      setLastMove({ from: serverMove.move.slice(0, 2), to: serverMove.move.slice(2, 4) })
    }
  }, [match, serverMove])

  /* Le back ne donne que l'UUID des joueurs : le pseudo se demande à part.
     Un camp tenu par un bot n'a pas d'UUID — il s'annonce par son niveau. */
  useEffect(() => {
    if (match === null || mySide === null) {
      setOpponentName(null)
      return
    }

    const opponentId = mySide === 'WHITE' ? match.blackPlayerId : match.whitePlayerId
    if (opponentId === null) {
      const level = mySide === 'WHITE' ? match.blackBotLevel : match.whiteBotLevel
      setOpponentName(level === null ? 'Bot' : `Bot · niveau ${level}`)
      return
    }

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
  /* Le trait du plateau affiché, qui a déjà avancé quand on vient de jouer sans
     que la réponse du serveur soit revenue. */
  const localSide: ChessSide = view.turn === 'w' ? 'WHITE' : 'BLACK'
  /* Sans adversaire, hors de son tour, ou en attendant la réponse à son propre
     coup, le plateau ne répond pas. Cette dernière condition compte surtout
     contre le bot, où l'aller-retour est si court qu'on jouerait sinon deux
     coups d'affilée - dont un pour lui. */
  const playable = running && isMyTurn && localSide === mySide

  /* Cette modale n'a pas d'issue : sans ce filet, une partie qui s'arrête pendant
     qu'elle est ouverte (abandon adverse, déconnexion) la laisserait en travers
     de l'écran, à demander une pièce pour un coup qui ne peut plus partir. */
  useEffect(() => {
    if (!playable) setPromotion(null)
  }, [playable])

  /* Le dernier coup de la position affichée, quel qu'en soit l'auteur. Se lit
     dans l'historique dès qu'il y en a un, ce qui couvre le coup du bot sans
     avoir à le nommer ; `lastMove` ne sert plus qu'aux parties reprises depuis
     un FEN, qui arrivent sans historique. */
  const played = view.history.at(-1)
  const highlighted =
    played === undefined
      ? lastMove
      : { from: played.lan.slice(0, 2), to: played.lan.slice(2, 4) }

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

  /** Joue le coup localement et l'envoie au serveur. `piece` n'est renseigné que
   *  pour une promotion, et devient la dernière lettre de l'UCI (`e7e8n`). */
  const playMove = (from: string, to: string, piece?: PromotionPiece) => {
    if (match === null) return

    const played = chess.move({ from: from as Square, to: to as Square, promotion: piece })

    setGame({ chess, view: snapshot(chess) })
    setLastMove({ from, to })
    clearSelection()

    /* Le coup part au serveur dès qu'il est joué. On l'affiche sans attendre la
       réponse : chess.js a déjà vérifié qu'il est légal, et un refus du back
       nous ramènerait de toute façon sur sa position. */
    void online.play(match.matchId, played.lan)
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

    /* Un pion qui arrive au bout doit dire en quoi il se transforme : on laisse
       le coup en suspens et la modale le reprend. La sélection reste posée, donc
       le plateau continue de montrer d'où part le pion. */
    const promoting = chess
      .moves({ square: selected as Square, verbose: true })
      .some((move) => move.to === square && move.promotion !== undefined)

    if (promoting) {
      setPromotion({ from: selected, to: square })
      return
    }

    playMove(selected, square)
  }

  /** La pièce choisie termine le coup laissé en suspens. */
  const promoteTo = (piece: PromotionPiece) => {
    if (promotion === null) return

    playMove(promotion.from, promotion.to, piece)
    setPromotion(null)
  }

  /** Refermer la modale sans choisir annule le coup : rien n'est parti au
   *  serveur, le pion n'a pas bougé. On rend la case à la sélection pour
   *  repartir du même pion sans avoir à le reprendre. */
  const cancelPromotion = () => {
    setPromotion(null)
    if (promotion !== null) select(promotion.from)
  }

  /** Referme une partie terminée. Sans ce `leave`, la resynchronisation
   *  ramènerait aussitôt sa position finale, et le back interdirait toute
   *  nouvelle invitation aux deux joueurs. */
  const leaveMatch = () => {
    online.leave()
    clearSelection()
  }

  const openBot = () => {
    setBotError(null)
    setBotOpen(true)
  }

  /** Lance la partie puis referme la modale. Un refus du back la laisse ouverte,
   *  le message se lisant à côté du bouton qu'on vient d'actionner. */
  const startBot = async (side: ChessSide, botLvl: number) => {
    setBotPending(true)
    setBotError(null)

    try {
      await online.startBot(side, botLvl)
      clearSelection()
      setBotOpen(false)
    } catch (err: unknown) {
      setBotError(err instanceof ApiError ? err.message : 'Partie contre le bot impossible.')
    } finally {
      setBotPending(false)
    }
  }

  const openInvite = () => {
    setInviteError(null)
    setInviteSent(null)
    setInviteOpen(true)
  }

  /** Envoie l'invitation puis referme la modale. Un refus du back la laisse
   *  ouverte : le message se lit à côté de la liste et on peut réessayer. */
  const invite = async (userName: string, side: ChessSide | null) => {
    setInvitePending(userName)
    setInviteError(null)

    try {
      // Le back renvoie le camp retenu : c'est lui qui tranche en cas d'aléatoire.
      const invitation = await sendChessInvitation(userName, side)
      setInviteSent({ userName, side: invitation.fromSide })
      setInviteOpen(false)
    } catch (err: unknown) {
      setInviteError(err instanceof ApiError ? err.message : 'Invitation refusée.')
    } finally {
      setInvitePending(null)
    }
  }

  const rounds = toRounds(view.history)
  const captures = capturesOf(view.squares)
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
            ? 'Invitez un(e) ami(e), ou lancez une partie contre le bot.'
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
            lastMove={highlighted}
            onSquareClick={handleSquareClick}
          />

          {/* Près du plateau, et pas dans le panneau : la modale prolonge le coup
              qu'on vient de jouer, elle ne fait pas partie des commandes. */}
          <ChessPromotionModal
            open={promotion !== null}
            white={mySide !== 'BLACK'}
            onClose={cancelPromotion}
            onSelect={promoteTo}
          />
        </div>

        <aside className={s.panel} aria-label="Informations de la partie">
          <div className={s.players}>
            <div className={s.player}>
              <p className={s.playerLine}>
                <span className={s.side}>Noirs</span>
                <span className={s.name}>{blackName}</span>
              </p>
              <CapturedPieces pieces={captures.byBlack} advantage={-captures.advantage} />
            </div>
            <div className={s.player}>
              <p className={s.playerLine}>
                <span className={s.side}>Blancs</span>
                <span className={s.name}>{whiteName}</span>
              </p>
              <CapturedPieces pieces={captures.byWhite} advantage={captures.advantage} />
            </div>
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

            <Button variant="primary" fullWidth disabled={running} onClick={openBot}>
              Jouer contre le bot
            </Button>

            <ChessBotModal
              open={botOpen}
              pending={botPending}
              error={botError}
              onClose={() => setBotOpen(false)}
              onStart={(side, botLvl) => void startBot(side, botLvl)}
            />

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
                Invitation envoyée à {inviteSent.userName} — vous jouerez les{' '}
                {inviteSent.side === 'WHITE' ? 'blancs' : 'noirs'}.
              </p>
            )}

          </div>
        </aside>
      </section>
    </AppLayout>
  )
}
