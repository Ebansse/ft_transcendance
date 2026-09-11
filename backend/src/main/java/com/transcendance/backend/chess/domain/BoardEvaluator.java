package com.transcendance.backend.chess.domain;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.Piece;
import com.github.bhlangonijr.chesslib.PieceType;
import com.github.bhlangonijr.chesslib.Side;

import lombok.NoArgsConstructor;

@NoArgsConstructor
public final class BoardEvaluator {

    private static final PieceType[] SCORED_TYPES = {
            PieceType.PAWN,
            PieceType.KNIGHT,
            PieceType.BISHOP,
            PieceType.ROOK,
            PieceType.QUEEN
    };
    /**
     * Evaluates the position from the point of view of the side to move.
     *
     * @param board the position to judge
     * @return the score in centipawns, positive when the side to move is ahead
     */
    public static int evaluate(Board board) {
        Side side = board.getSideToMove();

        return materialOf(board, side) - materialOf(board, side.flip());
    }

    /**
     * Counts the material of a side.
     *
     * @param board the position to read
     * @param side  the side whose material is counted
     * @return the total value in centipawns, always positive
     */
    private static int materialOf(Board board, Side side) {
        int total = 0;

        for (PieceType type : SCORED_TYPES) {
            long squares = board.getBitboard(Piece.make(side, type));
            total += Long.bitCount(squares) * valueOf(type);
        }

        return total;
    }

    /**
     * Returns the value of a piece type in centipawns.
     *
     * @param type the piece type
     * @return its value, 0 for the king and for no piece at all
     */
    private static int valueOf(PieceType type) {
        return switch (type) {
            case PAWN -> 100;
            case KNIGHT -> 320;
            case BISHOP -> 330;
            case ROOK -> 500;
            case QUEEN -> 900;
            default -> 0;
        };
    }
}
