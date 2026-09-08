import { useState } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { Button } from '../components/Button.tsx'
import { ChessBoard, type BoardOrientation } from '../components/ChessBoard.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import {
  START_FEN,
  applyMove,
  indexOfSquare,
  isWhitePiece,
  parseFen,
  toFen,
  toUci,
  type ChessPosition,
} from '../lib/chessBoard.ts'
import s from './ChessPage.module.css'

type ChessPageProps = {
  onNavigate: (action: string) => void
}

/** Regroupe les coups deux par deux pour l'affichage : « 1. e2e4 e7e5 ». */
function toRounds(moves: string[]) {
  const rounds: { number: number; white: string; black: string | null }[] = []

  for (let i = 0; i < moves.length; i += 2) {
    rounds.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] ?? null })
  }

  return rounds
}

/** Page Échecs, premier jet : l'échiquier tourne entièrement en local, sans
 *  aucun appel au back. Les règles ne sont donc pas appliquées — n'importe
 *  quelle pièce va n'importe où — et le camp au trait n'est qu'indicatif.
 *
 *  Le jour où l'on branchera `/api/chess/**`, seule la source de la position
 *  change : le FEN viendra de `ChessMatchDto` et les coups partiront en UCI
 *  sur `POST /api/chess/matches/{id}/moves`. Le reste de la page tient. */
export function ChessPage({ onNavigate }: ChessPageProps) {
  const { user } = useAuthModal()

  const [position, setPosition] = useState<ChessPosition>(() => parseFen(START_FEN))
  const [selected, setSelected] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [orientation, setOrientation] = useState<BoardOrientation>('white')
  const [moves, setMoves] = useState<string[]>([])

  const pieceOn = (square: string) => position.squares[indexOfSquare(square)]

  const handleSquareClick = (square: string) => {
    const piece = pieceOn(square)

    if (selected === null) {
      if (piece !== null) setSelected(square)
      return
    }

    if (square === selected) {
      setSelected(null)
      return
    }

    /* Clic sur une pièce de la même couleur : on change de sélection plutôt
       que de manger son propre camp. */
    const from = pieceOn(selected)
    if (piece !== null && from !== null && isWhitePiece(piece) === isWhitePiece(from)) {
      setSelected(square)
      return
    }

    setPosition(applyMove(position, selected, square))
    setMoves((played) => [...played, toUci(selected, square)])
    setLastMove({ from: selected, to: square })
    setSelected(null)
  }

  const resetGame = () => {
    setPosition(parseFen(START_FEN))
    setSelected(null)
    setLastMove(null)
    setMoves([])
  }

  const rounds = toRounds(moves)
  const sideToMoveLabel = position.sideToMove === 'w' ? 'Trait aux blancs' : 'Trait aux noirs'

  return (
    <AppLayout current="nav:chess" onNavigate={onNavigate}>
      <PageHeader
        title="Échecs"
        subtitle="Plateau local : les pièces se déplacent librement, aucune règle n'est encore appliquée."
      />

      <section className={s.layout} aria-labelledby="chess-board-title">
        <div>
          <SectionTitle id="chess-board-title">Plateau</SectionTitle>
          <ChessBoard
            position={position}
            orientation={orientation}
            selected={selected}
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

          <p className={s.turn}>
            {sideToMoveLabel} · coup {position.fullmove}
          </p>

          <div className={s.moves}>
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

          <div className={s.fen}>
            <p className={s.blockTitle}>FEN</p>
            <code className={s.fenValue}>{toFen(position)}</code>
          </div>

          <div className={s.actions}>
            <Button variant="primary" fullWidth onClick={resetGame}>
              Nouvelle partie
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setOrientation((side) => (side === 'white' ? 'black' : 'white'))}
            >
              Retourner l'échiquier
            </Button>
            <Button variant="secondary" fullWidth disabled>
              Abandonner
            </Button>
            <p className={s.hint}>
              Abandon, invitations et parties en ligne arriveront avec le branchement du serveur.
            </p>
          </div>
        </aside>
      </section>
    </AppLayout>
  )
}
