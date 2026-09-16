import { glyphOf, nameOf } from '../lib/chessBoard.ts'
import { useDialog } from './useDialog.ts'
import s from './ChessPromotionModal.module.css'

/** Les quatre promotions possibles, de la plus forte à la plus faible. Le roi et
 *  le pion n'en sont pas : les règles ne les autorisent pas. */
export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

const CHOICES: PromotionPiece[] = ['q', 'r', 'b', 'n']

type ChessPromotionModalProps = {
  open: boolean
  /** Camp du pion promu : décide de la couleur des glyphes proposés. */
  white: boolean
  onSelect: (piece: PromotionPiece) => void
}

/** Choix de la pièce quand un pion atteint la dernière rangée.
 *
 *  Modale sans issue : ni croix, ni Annuler, ni Échap, ni clic dans le fond. Le
 *  coup est déjà décidé, seule la pièce manque — laisser refermer bloquerait la
 *  partie sur un demi-coup. */
export function ChessPromotionModal({ open, white, onSelect }: ChessPromotionModalProps) {
  // Le focus part sur la dame, la promotion de loin la plus courante.
  const dialog = useDialog(open, 'button', () => {}, false)

  return (
    <dialog {...dialog} className={s.dialog} aria-labelledby="chess-promotion-title">
      <h2 id="chess-promotion-title" className={s.title}>
        Promotion
      </h2>
      <p className={s.note}>Votre pion arrive au bout : choisissez sa pièce.</p>

      <div className={s.choices} role="group" aria-labelledby="chess-promotion-title">
        {CHOICES.map((piece) => {
          const label = nameOf(white ? piece.toUpperCase() : piece)

          return (
            <button
              key={piece}
              type="button"
              className={s.choice}
              aria-label={label}
              onClick={() => onSelect(piece)}
            >
              <span className={white ? `${s.piece} ${s.white}` : s.piece} aria-hidden="true">
                {glyphOf(piece)}
              </span>
              <span className={s.name}>{label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>
    </dialog>
  )
}
