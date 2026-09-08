import { SQUARE_NAMES, glyphOf, isWhitePiece, nameOf, type ChessPosition } from '../lib/chessBoard.ts'
import s from './ChessBoard.module.css'

export type BoardOrientation = 'white' | 'black'

type ChessBoardProps = {
  position: ChessPosition
  /** Camp affiché en bas de l'échiquier. */
  orientation?: BoardOrientation
  /** Case en attente de destination, mise en avant. */
  selected?: string | null
  /** Départ et arrivée du dernier coup joué, teintés pour le retrouver. */
  lastMove?: { from: string; to: string } | null
  onSquareClick: (square: string) => void
}

/** Vue pure de l'échiquier : elle ne décide rien, elle dessine la position
 *  qu'on lui passe et remonte les clics. Chaque case est un vrai bouton, donc
 *  l'échiquier se parcourt et se joue entièrement au clavier. */
export function ChessBoard({
  position,
  orientation = 'white',
  selected = null,
  lastMove = null,
  onSquareClick,
}: ChessBoardProps) {
  /* Vue noirs : on lit le plateau à l'envers, cases *et* coordonnées suivent. */
  const order =
    orientation === 'white'
      ? SQUARE_NAMES.map((square, index) => ({ square, index }))
      : SQUARE_NAMES.map((square, index) => ({ square, index })).reverse()

  return (
    <div className={s.board} role="group" aria-label="Échiquier">
      {order.map(({ square, index }, position0) => {
        const piece = position.squares[index]
        const isLight = (Math.floor(index / 8) + (index % 8)) % 2 === 0
        const isLastMove = lastMove !== null && (lastMove.from === square || lastMove.to === square)

        const classes = [s.square, isLight ? s.light : s.dark]
        if (square === selected) classes.push(s.selected)
        if (isLastMove) classes.push(s.lastMove)

        return (
          <button
            key={square}
            type="button"
            className={classes.join(' ')}
            aria-pressed={square === selected}
            aria-label={piece === null ? `${square}, case vide` : `${square}, ${nameOf(piece)}`}
            onClick={() => onSquareClick(square)}
          >
            {piece === null ? null : (
              <span
                className={isWhitePiece(piece) ? `${s.piece} ${s.white}` : s.piece}
                aria-hidden="true"
              >
                {glyphOf(piece)}
              </span>
            )}

            {/* Coordonnées dans les marges du plateau affiché : colonne de
                gauche pour les rangées, dernière ligne pour les colonnes. */}
            {position0 % 8 === 0 ? (
              <span className={s.rankLabel} aria-hidden="true">
                {square[1]}
              </span>
            ) : null}
            {position0 >= 56 ? (
              <span className={s.fileLabel} aria-hidden="true">
                {square[0]}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
